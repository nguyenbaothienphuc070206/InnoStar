import { Injectable } from "@nestjs/common";
import {
  CameraNode,
  CityUser,
  ParkingEvent,
  ParkingIncident,
  ParkingMetrics,
  Slot,
  TrafficLevel
} from "../parking.types";

@Injectable()
export class SimulationEngineService {
  private readonly center = { lat: 10.772, lng: 106.698 };

  simulateTraffic(): TrafficLevel {
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return "HIGH";
    }
    if ((hour >= 10 && hour <= 12) || (hour >= 15 && hour <= 16)) {
      return "MEDIUM";
    }
    return "LOW";
  }

  simulateSlots(slots: Slot[], timestamp: string, traffic: TrafficLevel): { slots: Slot[]; events: ParkingEvent[] } {
    const events: ParkingEvent[] = [];

    const nextSlots = slots.map((slot) => {
      const baseOccupiedProb = traffic === "HIGH" ? 0.72 : traffic === "MEDIUM" ? 0.55 : 0.38;
      const zoneBias = slot.zone === "green" ? -0.05 : 0.04;
      const occupancyProb = this.clamp(baseOccupiedProb + zoneBias, 0.12, 0.92);
      const randomSeed = Math.random();
      const nextStatus: Slot["status"] =
        randomSeed < occupancyProb * 0.78
          ? "occupied"
          : randomSeed < occupancyProb * 0.9
            ? "reserved"
            : randomSeed > 0.94
              ? "leaving"
              : "free";
      const willBeOccupied = nextStatus === "occupied";
      const soon = nextStatus === "reserved" || nextStatus === "leaving";
      const predictedFreeMin =
        nextStatus === "occupied"
          ? 6 + Math.round(Math.random() * 10)
          : nextStatus === "reserved"
            ? 3 + Math.round(Math.random() * 6)
            : nextStatus === "leaving"
              ? 1 + Math.round(Math.random() * 4)
              : 0;
      const distanceM = Math.round(this.computeDistanceMeters([slot.lat ?? this.center.lat, slot.lng ?? this.center.lng], [this.center.lat, this.center.lng]));

      if (slot.available !== !willBeOccupied) {
        events.push({
          event: willBeOccupied ? "SLOT_OCCUPIED" : "SLOT_RELEASED",
          slotId: `S${slot.id}`,
          time: timestamp,
          message: `Slot S${slot.id} is now ${willBeOccupied ? "occupied" : "available"}`
        });
      }

      return {
        ...slot,
        status: nextStatus,
        available: !willBeOccupied,
        soon,
        predictedFreeMin,
        distanceM,
        updatedAt: timestamp
      };
    });

    return { slots: nextSlots, events };
  }

  simulateUsers(): CityUser[] {
    return Array.from({ length: 40 }).map((_, index) => ({
      id: `U${index + 1}`,
      lat: this.center.lat + (Math.random() - 0.5) * 0.016,
      lng: this.center.lng + (Math.random() - 0.5) * 0.018,
      speedKmh: Number((8 + Math.random() * 34).toFixed(1)),
      target: Math.random() > 0.35 ? "parking" : "city-walk",
      urgency: Math.random() > 0.86 ? "high" : Math.random() > 0.44 ? "medium" : "low",
      preferredProfile: Math.random() > 0.68 ? "eco" : Math.random() > 0.34 ? "fastest" : "chill",
      reservedSlotId: Math.random() > 0.7 ? Math.floor(Math.random() * 60) + 1 : undefined
    }));
  }

  getMetrics(slots: Slot[], traffic: TrafficLevel): ParkingMetrics {
    const available = slots.filter((slot) => slot.available).length;
    const availability = Number((available / Math.max(1, slots.length)).toFixed(3));
    const apiLatency = Number(this.clamp(95 + Math.random() * 120 + (traffic === "HIGH" ? 35 : 0), 60, 320).toFixed(0));
    const uptime = Number(this.clamp(99.15 + (Math.random() - 0.5) * 0.55, 98.2, 99.98).toFixed(2));
    const co2ReductionKg = Number((4.2 + availability * 3.4).toFixed(2));

    return {
      availability,
      traffic,
      apiLatency,
      uptime,
      co2ReductionKg
    };
  }

  detectIncidents(timestamp: string, metrics: ParkingMetrics, cameras: CameraNode[], events: ParkingEvent[]): ParkingIncident[] {
    const output: ParkingIncident[] = [];

    if (metrics.availability < 0.2) {
      output.push({
        id: `shortage-${Math.floor(Date.now() / 10000)}`,
        level: "critical",
        source: "Capacity Optimizer",
        message: "Parking shortage: availability below 20%",
        createdAt: timestamp
      });
      events.push({
        event: "PARKING_SHORTAGE",
        time: timestamp,
        message: "Parking shortage detected"
      });
    }

    const offlineCameras = cameras.filter((camera) => camera.status === "offline").slice(0, 3);
    for (const camera of offlineCameras) {
      output.push({
        id: `cam-off-${camera.id}`,
        level: "warning",
        source: "Camera Fleet",
        message: `${camera.id} offline (latency ${camera.latencyMs}ms)`,
        createdAt: timestamp
      });
      events.push({
        event: "CAMERA_OFFLINE",
        cameraId: camera.id,
        time: timestamp,
        message: `${camera.id} offline`
      });
    }

    if (output.length === 0) {
      output.push({
        id: `info-${Math.floor(Date.now() / 60000)}`,
        level: "info",
        source: "Ops Monitor",
        message: "System stable",
        createdAt: timestamp
      });
    }

    return output.slice(0, 8);
  }

  private computeDistanceMeters(a: [number, number], b: [number, number]): number {
    const latDiff = (a[0] - b[0]) * 111_000;
    const lngDiff = (a[1] - b[1]) * 111_000;
    return Math.hypot(latDiff, lngDiff);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
