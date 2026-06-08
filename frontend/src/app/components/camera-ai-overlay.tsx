"use client";

import { useEffect, useRef } from "react";

type CameraAIOverlayProps = {
  active: boolean;
  seed: number;
  width?: number;
  height?: number;
};

export default function CameraAIOverlay({ active, width = 320, height = 188 }: CameraAIOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    if (!active) {
      return;
    }

    const label = "✓ EV Detected";
    const confidence = "Confidence 94%";
    ctx.font = "10px Space Grotesk";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;

    const x = width - 10;
    const y = 10;
    ctx.fillStyle = "#dfffd3";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "rgba(223, 255, 211, 0.7)";
    ctx.fillText(confidence, x, y + 13);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }, [active, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="aiOverlayCanvas" aria-hidden />;
}
