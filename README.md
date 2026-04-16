# GreenPark AI

GreenPark AI is a monorepo for an intelligent parking and green-travel platform for Ho Chi Minh City.

## Project structure

- `frontend/`: Next.js app with realtime parking map, green score, and two-way user interaction.
- `backend/`: NestJS API + WebSocket gateway that polls AI detections and broadcasts slot updates.
- `ai-service/`: FastAPI + YOLO service that detects vehicles from video/images and maps occupancy.
- `infra/`: Infrastructure placeholders for production config and deployment assets.

## Realtime flow

Camera -> AI detect -> Backend poller -> WebSocket -> Frontend map

## Features included

- Realtime parking slots with neon pulse for available slots.
- Green route suggestion endpoint and score.
- Interactive OSM map with live route polyline and slot markers.
- Two-way interaction:
  - User can report slot conditions.
  - User can upload real scene images.
- Personalized profile name and saved eco stats in frontend.
- Admin dashboard for occupancy analytics, heatmap, predictive slot availability, and community reports.
- JWT auth flow (register/login/me) with profile persistence in Postgres.
- Redis-backed camera ingest queue and multi-camera management endpoints.
- Hourly heatmap endpoint based on persisted parking events.
- Enterprise API gateway conventions with versioned routes at /api/v1.
- Global request tracing (x-request-id), uniform error envelope, and rate limiting.
- Ops endpoints for liveness/readiness/health checks.
- RBAC authorization with roles: admin, operator, user.
- Database audit log for mutating API calls.
- Circuit breaker and retry strategy for AI polling resilience.
- Migration-first database lifecycle (synchronize disabled by default).
- Eco-focused UI theme with `#5DFF34`, `#1FF4FA`, `#753309`.

## Run with Docker

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- AI Service: http://localhost:8000
- Postgres: localhost:5432
- Redis: localhost:6379

## Run locally without Docker

### 1) frontend

```bash
cd frontend
npm install
npm run dev
```

### 2) backend

```bash
cd backend
npm install
npm run start:dev
```

Migrations (run after build):

```bash
cd backend
npm run build
npm run migration:run
```

### 3) ai-service

```bash
cd ai-service
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Key API endpoints

- `GET /api/v1/parking/slots`
- `GET /api/v1/parking/route?destination=...`
- `POST /api/v1/parking/report`
- `POST /api/v1/parking/upload`
- `GET /api/v1/parking/reports`
- `GET /api/v1/parking/analytics`
- `GET /api/v1/parking/predict`
- `GET /api/v1/parking/heatmap-hourly`
- `GET /api/v1/parking/personalized?user=...&interest=...`
- `POST /api/v1/parking/checkin`
- `GET /api/v1/parking/leaderboard`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (Bearer token)
- `POST /api/v1/cameras`
- `GET /api/v1/cameras`
- `POST /api/v1/cameras/sync`
- `GET /detect`
- `GET /detect/{camera_id}`
- `GET /api/v1/ops/live`
- `GET /api/v1/ops/ready`
- `GET /api/v1/ops/health` (admin/operator)

RBAC-protected endpoints:

- `POST /api/v1/cameras` (admin/operator)
- `GET /api/v1/cameras` (admin/operator)
- `POST /api/v1/cameras/sync` (admin/operator)

Bootstrap rule:

- The first registered account is assigned `admin` role automatically.

## Frontend routes

- `/`: Live map for users
- `/admin`: Admin dashboard

## Production mindset recommendations

- Frontend: deploy on Vercel.
- Backend: deploy on AWS ECS or EC2 behind ALB.
- AI service: deploy on GPU-enabled server (EC2 G4/G5 or on-prem GPU).
- Add Redis queue + worker for image/video processing.
- Add Postgres + TimescaleDB for slot history and predictive parking analytics.
- Add observability with Prometheus + Grafana + OpenTelemetry.
