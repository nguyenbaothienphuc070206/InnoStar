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
  images: string[];
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

  function trafficPenalty(level: AITrafficZone["level"]): number {
    if (level === "HIGH") {
      return 3;
    }
    if (level === "MEDIUM") {
      return 1;
    }
    return 0;
  }

  function syncCameraToParking(
    cams: AICameraSlot[],
    lotSlots: AIParkingSlot[],
    zones: AITrafficZone[]
  ): AIParkingSlot[] {
    return lotSlots.map((slot) => {
      const nearCams = cams.filter((cam) => Math.hypot(cam.lat - slot.lat, cam.lng - slot.lng) < 0.0012);
      const occupiedByCam = nearCams.filter((cam) => cam.occupied).length;
      const nearestZone = zones
        .slice()
        .sort((a, b) => Math.hypot(a.lat - slot.lat, a.lng - slot.lng) - Math.hypot(b.lat - slot.lat, b.lng - slot.lng))[0];
      const penalty = nearestZone ? trafficPenalty(nearestZone.level) : 0;
      const baseAvailable = slot.capacity - occupiedByCam * 2 - penalty;
      const jitter = Math.floor(Math.random() * 3) - 1;
      const nextAvailable = Math.max(0, Math.min(slot.capacity, baseAvailable + jitter));

      return {
        ...slot,
        available: nextAvailable
      };
    });
  }

  useEffect(() => {
    fetch("/data/parking.json").then((r) => r.json()).then(setSlots).catch(() => setSlots([]));
    fetch("/data/traffic.json").then((r) => r.json()).then(setTraffic).catch(() => setTraffic([]));
    fetch("/data/pklot.json").then((r) => r.json()).then(setCamera).catch(() => setCamera([]));
    fetch("/data/places.json").then((r) => r.json()).then(setPlaces).catch(() => setPlaces([]));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTraffic((prevTraffic) => {
        const levels: Array<"LOW" | "MEDIUM" | "HIGH"> = ["LOW", "MEDIUM", "HIGH"];
        const nextTraffic = prevTraffic.map((zone) => ({
          ...zone,
          level: levels[Math.floor(Math.random() * levels.length)]
        }));

        setCamera((prevCamera) => {
          const nextCamera = prevCamera.map((item) => ({
            ...item,
            occupied: Math.random() > 0.5
          }));

          setSlots((prevSlots) => syncCameraToParking(nextCamera, prevSlots, nextTraffic));

          return nextCamera;
        });

        return nextTraffic;
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  return { slots, traffic, camera, places };
}
