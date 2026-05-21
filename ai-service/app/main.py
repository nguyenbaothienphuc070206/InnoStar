from __future__ import annotations

from contextvars import ContextVar
import logging
import os
from pathlib import Path
from typing import Any
import random
from time import perf_counter
from uuid import uuid4

import cv2
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
from ultralytics import YOLO

app = FastAPI(title="GreenPark AI Service")

logger = logging.getLogger("greenpark.ai")
logging.basicConfig(level=logging.INFO)
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="n/a")

BASE_DIR = Path(__file__).resolve().parent.parent
VIDEO_PATH = BASE_DIR / "data" / os.getenv("AI_VIDEO_PATH", "video.mp4")
MODEL_NAME = os.getenv("AI_MODEL_NAME", "yolov8n.pt")
APP_ENV = os.getenv("APP_ENV", "development")

# Slot format: x, y, w, h on an arbitrary map coordinate space (0-100)
SLOTS = [
    {"id": 1, "type": "car", "zone": "green", "x": 20, "y": 22, "w": 7, "h": 9},
    {"id": 2, "type": "car", "zone": "standard", "x": 34, "y": 38, "w": 7, "h": 9},
    {"id": 3, "type": "bike", "zone": "green", "x": 58, "y": 31, "w": 6, "h": 7},
    {"id": 4, "type": "bike", "zone": "standard", "x": 67, "y": 64, "w": 6, "h": 7},
    {"id": 5, "type": "car", "zone": "green", "x": 79, "y": 44, "w": 7, "h": 9},
]


try:
    model = YOLO(MODEL_NAME)
except Exception:
    model = None


class CameraIn(BaseModel):
    id: str
    stream_url: HttpUrl
    zone: str


CAMERAS: dict[str, dict[str, str]] = {}


def build_response(data: dict[str, Any], *, source: str = "service") -> dict[str, Any]:
    return {
        "meta": {
            "request_id": request_id_ctx.get(),
            "source": source,
            "environment": APP_ENV,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        },
        "data": data,
    }


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid4()))
    request_id_ctx.set(request_id)

    started = perf_counter()
    response = await call_next(request)
    elapsed_ms = round((perf_counter() - started) * 1000, 2)
    response.headers["x-request-id"] = request_id
    response.headers["x-response-time-ms"] = str(elapsed_ms)
    logger.info("%s %s [%s] %sms", request.method, request.url.path, request_id, elapsed_ms)
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    payload = {
        "error": {
            "status_code": exc.status_code,
            "message": str(exc.detail),
            "request_id": request_id_ctx.get(),
        }
    }
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception):
    logger.exception("Unhandled AI exception: %s", exc)
    payload = {
        "error": {
            "status_code": 500,
            "message": "internal_error",
            "request_id": request_id_ctx.get(),
        }
    }
    return JSONResponse(status_code=500, content=payload)


def overlap(slot: tuple[float, float, float, float], car: tuple[float, float, float, float]) -> bool:
    sx, sy, sw, sh = slot
    cx1, cy1, cx2, cy2 = car
    return not (cx2 < sx or cx1 > sx + sw or cy2 < sy or cy1 > sy + sh)


def detect_cars() -> list[tuple[float, float, float, float]]:
    if model is None or not VIDEO_PATH.exists():
        return []

    capture = cv2.VideoCapture(str(VIDEO_PATH))
    ok, frame = capture.read()
    capture.release()

    if not ok:
        return []

    results = model(frame)
    cars: list[tuple[float, float, float, float]] = []

    for result in results:
        for box in result.boxes:
            # COCO class 2 = car, class 3 = motorcycle
            detected_class = int(box.cls[0])
            if detected_class in {2, 3}:
                x1, y1, x2, y2 = box.xyxy.tolist()[0]
                cars.append((x1, y1, x2, y2))

    return cars


def mock_occupancy(slots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": slot["id"],
            "type": slot["type"],
            "zone": slot["zone"],
            "available": random.random() > 0.45,
            "x": slot["x"],
            "y": slot["y"],
        }
        for slot in slots
    ]


@app.get("/health")
def health() -> dict[str, Any]:
    return build_response(
        {
            "status": "ok",
            "model_loaded": model is not None,
            "cameras_count": len(CAMERAS),
        },
        source="health",
    )


@app.get("/ready")
def ready() -> dict[str, Any]:
    ready_state = model is not None or not VIDEO_PATH.exists()
    return build_response(
        {
            "ready": ready_state,
            "video_source_exists": VIDEO_PATH.exists(),
            "model_name": MODEL_NAME,
        },
        source="readiness",
    )


@app.get("/detect")
def detect() -> dict[str, Any]:
    cars = detect_cars()

    if not cars:
        slots = mock_occupancy(SLOTS)
        return build_response({"cars": [], "slots": slots, "source": "mock"}, source="detect")

    mapped_slots: list[dict[str, Any]] = []
    for slot in SLOTS:
        # In production this map should convert detection pixels to slot polygons.
        slot_rect = (slot["x"], slot["y"], slot["w"], slot["h"])
        occupied = any(overlap(slot_rect, car) for car in cars)
        mapped_slots.append(
            {
                "id": slot["id"],
                "type": slot["type"],
                "zone": slot["zone"],
                "available": not occupied,
                "x": slot["x"],
                "y": slot["y"],
            }
        )

    return build_response({"cars": cars, "slots": mapped_slots, "source": "yolo"}, source="detect")


@app.post("/cameras")
def register_camera(payload: CameraIn) -> dict[str, Any]:
    CAMERAS[payload.id] = {
        "stream_url": str(payload.stream_url),
        "zone": payload.zone,
    }
    return build_response({"ok": True, "camera": {"id": payload.id, **CAMERAS[payload.id]}}, source="camera")


@app.get("/cameras")
def list_cameras() -> dict[str, Any]:
    return build_response({"cameras": [{"id": key, **value} for key, value in CAMERAS.items()]}, source="camera")


@app.get("/detect/{camera_id}")
def detect_from_camera(camera_id: str) -> dict[str, Any]:
    if camera_id not in CAMERAS:
        raise HTTPException(status_code=404, detail="Camera not found")

    payload = detect()
    payload["data"]["camera"] = {"id": camera_id, **CAMERAS[camera_id]}
    return payload


@app.post("/upload")
async def upload(photo: UploadFile = File(...)) -> dict[str, str]:
    uploads = BASE_DIR / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    target = uploads / photo.filename

    content = await photo.read()
    target.write_bytes(content)

    return build_response({"status": "received", "filename": photo.filename}, source="upload")


@app.get("/live")
def live() -> dict[str, str]:
    return build_response({"message": "Attach RTSP/WebRTC stream service here in production."}, source="live")
