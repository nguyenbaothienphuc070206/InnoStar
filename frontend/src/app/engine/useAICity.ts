import { useEffect, useState } from "react";

export type AIParkingSlot = {
  id: number;
  lat: number;
  lng: number;
  capacity: number;
  available: number;
};

export type AITrafficZone = {
  zone: string;
  lat: number;
  lng: number;
  level: "LOW" | "MEDIUM" | "HIGH";
};

export type AICameraSlot = {
  id: string;
  lat: number;
  lng: number;
  occupied: boolean;
};

export type AIPlace = {
  id: number;
  name: string;
  type: "history" | "daily" | "local";
  persona: "COBA" | "DRIVER" | "YOUTH";
  lat: number;
  lng: number;
  desc: string;
};

export function useAICity() {
  const [slots, setSlots] = useState<AIParkingSlot[]>([]);
  const [traffic, setTraffic] = useState<AITrafficZone[]>([]);
  const [camera, setCamera] = useState<AICameraSlot[]>([]);
  const [places, setPlaces] = useState<AIPlace[]>([]);

  useEffect(() => {
    fetch("/data/parking.json").then((r) => r.json()).then(setSlots).catch(() => setSlots([]));
    fetch("/data/traffic.json").then((r) => r.json()).then(setTraffic).catch(() => setTraffic([]));
    fetch("/data/pklot.json").then((r) => r.json()).then(setCamera).catch(() => setCamera([]));
    fetch("/data/places.json").then((r) => r.json()).then(setPlaces).catch(() => setPlaces([]));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlots((prev) =>
        prev.map((slot) => {
          const delta = Math.floor(Math.random() * 5 - 2);
          const available = Math.max(0, Math.min(slot.capacity, slot.available + delta));
          return { ...slot, available };
        })
      );

      setTraffic((prev) => {
        const levels: Array<"LOW" | "MEDIUM" | "HIGH"> = ["LOW", "MEDIUM", "HIGH"];
        return prev.map((zone) => ({
          ...zone,
          level: levels[Math.floor(Math.random() * levels.length)]
        }));
      });

      setCamera((prev) =>
        prev.map((item) => ({
          ...item,
          occupied: Math.random() > 0.5
        }))
      );
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  return { slots, traffic, camera, places };
}
