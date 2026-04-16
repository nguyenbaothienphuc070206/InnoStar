"use client";

import { useEffect, useMemo, useRef } from "react";

type Box = [number, number, number, number];

type CameraAIOverlayProps = {
  active: boolean;
  seed: number;
  width?: number;
  height?: number;
};

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

export default function CameraAIOverlay({ active, seed, width = 320, height = 188 }: CameraAIOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothRef = useRef<Box[]>([]);

  const targetBoxes = useMemo<Box[]>(() => {
    if (!active) {
      return [];
    }

    const x1 = 34 + (seed % 5) * 7;
    const y1 = 24 + (seed % 3) * 5;
    const x2 = x1 + 130;
    const y2 = y1 + 74;
    return [[x1, y1, x2, y2]];
  }, [active, seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let frameId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (!targetBoxes.length) {
        frameId = window.requestAnimationFrame(draw);
        return;
      }

      const previous = smoothRef.current;
      const blended = targetBoxes.map((next, index) => {
        const prev = previous[index] ?? next;
        return [
          lerp(prev[0], next[0], 0.2),
          lerp(prev[1], next[1], 0.2),
          lerp(prev[2], next[2], 0.2),
          lerp(prev[3], next[3], 0.2)
        ] as Box;
      });
      smoothRef.current = blended;

      blended.forEach(([x1, y1, x2, y2]) => {
        ctx.strokeStyle = "#5DFF34";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = "rgba(93, 255, 52, 0.16)";
        ctx.fillRect(x1, y1, x2 - x1, 16);
        ctx.fillStyle = "#DFFFD3";
        ctx.font = "11px Space Grotesk";
        ctx.fillText("Vehicle detected", x1 + 6, y1 + 12);
      });

      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [targetBoxes, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="aiOverlayCanvas" aria-hidden />;
}
