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

    ctx.strokeStyle = "rgba(123, 255, 194, 0.42)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.strokeStyle = "rgba(91, 231, 196, 0.26)";
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.lineTo(42, 18);
    ctx.lineTo(42, 26);
    ctx.moveTo(width - 42, height - 26);
    ctx.lineTo(width - 18, height - 26);
    ctx.lineTo(width - 18, height - 18);
    ctx.stroke();

    ctx.fillStyle = "rgba(123, 255, 194, 0.1)";
    ctx.fillRect(12, 12, 2, 18);
    ctx.fillRect(12, 12, 18, 2);
    ctx.fillRect(width - 14, height - 30, 2, 18);
    ctx.fillRect(width - 30, height - 14, 18, 2);
  }, [active, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="aiOverlayCanvas" aria-hidden />;
}
