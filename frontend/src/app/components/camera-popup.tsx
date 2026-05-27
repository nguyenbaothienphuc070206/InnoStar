"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CameraPopupProps = {
  cam: {
    id: string;
    occupied: boolean;
    images: string[];
  };
};

function playBeep(volume = 0.02) {
  if (typeof window === "undefined") {
    return;
  }

  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const ctx = new AudioCtx();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 980;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.08);
  window.setTimeout(() => {
    void ctx.close();
  }, 120);
}

export default function CameraPopup({ cam }: CameraPopupProps) {
  const [frame, setFrame] = useState(0);
  const lastStateRef = useRef(cam.occupied);

  const frames = useMemo(() => (cam.images.length > 0 ? cam.images : ["/camera/cam1.jpg"]), [cam.images]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrame((current) => (current + 1) % frames.length);
    }, 800);

    return () => window.clearInterval(interval);
  }, [frames.length]);

  useEffect(() => {
    if (lastStateRef.current !== cam.occupied) {
      playBeep(cam.occupied ? 0.024 : 0.018);
      lastStateRef.current = cam.occupied;
    }
  }, [cam.occupied]);

  return (
    <div className="camContainer">
      <img src={`${frames[frame]}?frame=${frame}`} className="camImg" alt={`Camera ${cam.id}`} />

      <div className="camOverlay">
        <div className="camLabel">AI: {cam.occupied ? "Occupied" : "Empty"}</div>
      </div>

      <div className="camScanLine" />
      <div className="camBBox" />

      <div className="camStatus">{cam.occupied ? "FULL" : "EMPTY"}</div>
    </div>
  );
}
