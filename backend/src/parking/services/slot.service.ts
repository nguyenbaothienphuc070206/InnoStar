import { Injectable } from "@nestjs/common";
import { Slot, SlotPrediction, ZoneHeat } from "../parking.types";

@Injectable()
export class SlotService {
  private readonly center = { lat: 10.772, lng: 106.698 };
  private slots: Slot[] = this.generateInitialSlots(160);
  private history: Array<{ timestamp: string; slots: Slot[] }> = [];

  constructor() {
    this.pushSnapshot(this.slots);
  }

  getAll(): Slot[] {
    return this.slots;
  }

  setAll(nextSlots: Slot[]): Slot[] {
    this.slots = nextSlots.map((slot) => ({
      ...slot,
      updatedAt: new Date().toISOString()
    }));
    this.pushSnapshot(this.slots);
    return this.slots;
  }

  setSimulated(nextSlots: Slot[], timestamp: string): Slot[] {
    this.slots = nextSlots.map((slot) => ({
      ...slot,
      updatedAt: timestamp
    }));
    this.pushSnapshot(this.slots);
    return this.slots;
  }

  computeDiff(prevSlots: Slot[], nextSlots: Slot[]) {
    const prevById = new Map(prevSlots.map((slot) => [slot.id, slot]));
    const changes = nextSlots
      .map((next) => {
        const prev = prevById.get(next.id);
        if (!prev) {
          return null;
        }

        const changed =
          prev.status !== next.status ||
          prev.available !== next.available ||
          prev.soon !== next.soon ||
          prev.predictedFreeMin !== next.predictedFreeMin ||
          prev.cameraOnline !== next.cameraOnline ||
          prev.distanceM !== next.distanceM;

        if (!changed) {
          return null;
        }

        return {
          type: "slot_update" as const,
          id: `S${next.id}`,
          status: next.status ?? (next.available ? "free" : "occupied"),
          occupied: !next.available,
          soon: Boolean(next.soon),
          predictedFreeMin: next.predictedFreeMin ?? 0,
          cameraOnline: next.cameraOnline !== false,
          distanceM: next.distanceM ?? 0,
          updatedAt: next.updatedAt ?? new Date().toISOString()
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return changes;
  }

  getPredictions(): SlotPrediction[] {
    const now = Date.now();

    return this.slots.map((slot) => {
      const averageBusyMs = this.getAverageBusyWindow(slot.id);
      const waitMs = slot.available ? 0 : averageBusyMs;

      return {
        slotId: slot.id,
        currentlyAvailable: slot.available,
        predictedAvailableAt: new Date(now + waitMs).toISOString(),
        confidence: slot.available ? 0.93 : 0.75
      };
    });
  }

  getZoneHeat(): ZoneHeat[] {
    return ["green", "standard"].map((zone) => {
      const zoneSlots = this.slots.filter((slot) => slot.zone === zone);
      const zoneOccupied = zoneSlots.filter((slot) => !slot.available).length;
      const zoneRate = zoneSlots.length === 0 ? 0 : Number(((zoneOccupied / zoneSlots.length) * 100).toFixed(2));
      return { zone, occupancyRate: zoneRate };
    }) as ZoneHeat[];
  }

  getOccupancyRate(): number {
    const total = this.slots.length || 1;
    const occupied = this.slots.filter((slot) => !slot.available).length;
    return Number(((occupied / total) * 100).toFixed(2));
  }

  getGreenAvailabilityRate(): number {
    const greenTotal = this.slots.filter((slot) => slot.zone === "green").length || 1;
    const greenAvailable = this.slots.filter((slot) => slot.zone === "green" && slot.available).length;
    return Number(((greenAvailable / greenTotal) * 100).toFixed(2));
  }

  getHistoryCount(): number {
    return this.history.length;
  }

  private generateInitialSlots(count: number): Slot[] {
    const hubs: Array<{ lat: number; lng: number; spread: number; region: "vn" | "global" }> = [
      { lat: 10.7769, lng: 106.7009, spread: 0.02, region: "vn" }, // Ho Chi Minh City
      { lat: 21.0278, lng: 105.8342, spread: 0.02, region: "vn" }, // Ha Noi
      { lat: 16.0544, lng: 108.2022, spread: 0.018, region: "vn" }, // Da Nang
      { lat: 12.2388, lng: 109.1967, spread: 0.016, region: "vn" }, // Nha Trang
      { lat: 10.0452, lng: 105.7469, spread: 0.016, region: "vn" }, // Can Tho
      { lat: 10.4114, lng: 107.1362, spread: 0.014, region: "vn" }, // Vung Tau
      { lat: 1.3521, lng: 103.8198, spread: 0.02, region: "global" }, // Singapore
      { lat: 13.7563, lng: 100.5018, spread: 0.02, region: "global" }, // Bangkok
      { lat: 35.6762, lng: 139.6503, spread: 0.018, region: "global" }, // Tokyo
      { lat: 37.5665, lng: 126.978, spread: 0.018, region: "global" }, // Seoul
      { lat: 48.8566, lng: 2.3522, spread: 0.02, region: "global" }, // Paris
      { lat: 51.5072, lng: -0.1276, spread: 0.02, region: "global" }, // London
      { lat: 40.7128, lng: -74.006, spread: 0.022, region: "global" }, // New York
      { lat: 34.0522, lng: -118.2437, spread: 0.024, region: "global" }, // Los Angeles
      { lat: -33.8688, lng: 151.2093, spread: 0.022, region: "global" } // Sydney
    ];

    return Array.from({ length: count }, (_, index) => {
      const hub = hubs[index % hubs.length];
      const lat = hub.lat + (Math.random() - 0.5) * hub.spread;
      const lng = hub.lng + (Math.random() - 0.5) * hub.spread;
      const available = Math.random() > 0.52;
      const soon = !available && Math.random() > 0.48;
      const x = Math.round(this.clamp(((lng - (this.center.lng - 0.0075)) / 0.015) * 100, 0, 100));
      const y = Math.round(this.clamp(((lat - (this.center.lat - 0.007)) / 0.014) * 100, 0, 100));

      return {
        id: index + 1,
        type: Math.random() > 0.28 ? "car" : "bike",
        zone: hub.region === "global" ? (Math.random() > 0.58 ? "green" : "standard") : Math.random() > 0.46 ? "green" : "standard",
        status: available ? "free" : soon ? "reserved" : "occupied",
        available,
        soon,
        predictedFreeMin: available ? 0 : soon ? 4 + Math.round(Math.random() * 6) : 10 + Math.round(Math.random() * 8),
        distanceM: Math.round(this.computeDistanceMeters([lat, lng], [this.center.lat, this.center.lng])),
        x,
        y,
        lat,
        lng,
        updatedAt: new Date().toISOString(),
        cameraOnline: true
      };
    });
  }

  private getAverageBusyWindow(slotId: number): number {
    const windows = this.history
      .map((item) => item.slots.find((slot) => slot.id === slotId))
      .filter((slot): slot is Slot => Boolean(slot));

    if (windows.length < 2) {
      return 12 * 60 * 1000;
    }

    let busyEvents = 0;
    for (let i = 1; i < windows.length; i += 1) {
      if (!windows[i].available && windows[i - 1].available) {
        busyEvents += 1;
      }
    }

    const baselineMs = 8 * 60 * 1000;
    return baselineMs + busyEvents * 2 * 60 * 1000;
  }

  private pushSnapshot(snapshot: Slot[]): void {
    this.history.push({
      timestamp: new Date().toISOString(),
      slots: snapshot.map((slot) => ({ ...slot }))
    });

    this.history = this.history.slice(-500);
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
