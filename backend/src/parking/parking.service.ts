import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ParkingAnalytics, RouteResult, Slot, SlotPrediction, ZoneHeat } from "./parking.types";
import { SlotEventEntity } from "./entities/slot-event.entity";
import { Repository } from "typeorm";

@Injectable()
export class ParkingService {
  private slots: Slot[] = [
    { id: 1, type: "car", zone: "green", available: true, x: 20, y: 22 },
    { id: 2, type: "car", zone: "standard", available: false, x: 34, y: 38 },
    { id: 3, type: "bike", zone: "green", available: true, x: 58, y: 31 },
    { id: 4, type: "bike", zone: "standard", available: false, x: 67, y: 64 },
    { id: 5, type: "car", zone: "green", available: true, x: 79, y: 44 }
  ];

  private reports: Array<{ user: string; message: string; createdAt: string }> = [];
  private history: Array<{ timestamp: string; slots: Slot[] }> = [];
  private ecoPoints: Record<string, number> = {
    "Eco Traveler": 240,
    Minh: 180,
    An: 165
  };

  constructor(
    @InjectRepository(SlotEventEntity)
    private readonly slotEventsRepo: Repository<SlotEventEntity>
  ) {
    this.pushSnapshot(this.slots);
  }

  getAll(): Slot[] {
    return this.slots;
  }

  update(newSlots: Slot[]): Slot[] {
    this.slots = newSlots.map((slot) => ({ ...slot, updatedAt: new Date().toISOString() }));
    this.pushSnapshot(this.slots);
    this.persistSlotEvents(this.slots).catch(() => null);
    return this.slots;
  }

  getGreenRoute(destination: string): RouteResult {
    const availableGreenSlots = this.slots.filter((slot) => slot.available && slot.zone === "green").length;
    const score = Math.min(99, 72 + availableGreenSlots * 4);

    return {
      destination,
      distance: Number((4.1 + availableGreenSlots * 0.3).toFixed(1)),
      emission: availableGreenSlots >= 2 ? "low" : "medium",
      score,
      etaMinutes: Math.max(8, 20 - availableGreenSlots * 2),
      path: [
        [10.7732, 106.698],
        [10.7744, 106.7015],
        [10.7758, 106.7042],
        [10.7768, 106.7071]
      ]
    };
  }

  addReport(user: string, message: string): void {
    this.reports.unshift({
      user,
      message,
      createdAt: new Date().toISOString()
    });

    this.reports = this.reports.slice(0, 100);
  }

  getReports() {
    return this.reports;
  }

  getPersonalizedPlan(user: string, interest: string) {
    const lowerInterest = interest.toLowerCase();
    const destination =
      lowerInterest.includes("cafe") ? "Tao Dan Garden Cafe" : lowerInterest.includes("park") ? "Gia Dinh Park" : "Ben Thanh Market";

    return {
      user,
      destination,
      theme: interest || "city walk",
      bestTime: "17:30",
      suggestion: "This route avoids heavy congestion and maximizes green parking availability.",
      route: this.getGreenRoute(destination)
    };
  }

  checkInEcoAction(user: string, mode: "bus" | "bike" | "walk" | "ev") {
    const points = mode === "walk" ? 20 : mode === "bike" ? 16 : mode === "bus" ? 12 : 15;
    this.ecoPoints[user] = (this.ecoPoints[user] || 0) + points;

    return {
      user,
      mode,
      pointsAdded: points,
      totalPoints: this.ecoPoints[user],
      badge: this.ecoPoints[user] >= 300 ? "Eco Driver Elite" : this.ecoPoints[user] >= 180 ? "Eco Driver" : "Green Starter"
    };
  }

  getLeaderboard() {
    return Object.entries(this.ecoPoints)
      .map(([user, points]) => ({ user, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }

  async getHourlyHeatmap() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.slotEventsRepo
      .createQueryBuilder("event")
      .select("EXTRACT(HOUR FROM event.createdAt)", "hour")
      .addSelect("event.zone", "zone")
      .addSelect("COUNT(*)", "count")
      .where("event.createdAt >= :since", { since: since.toISOString() })
      .andWhere("event.available = false")
      .groupBy("hour")
      .addGroupBy("event.zone")
      .orderBy("hour", "ASC")
      .getRawMany<{ hour: string; zone: string; count: string }>();

    return rows.map((row) => ({
      hour: Number(row.hour),
      zone: row.zone,
      busyEvents: Number(row.count)
    }));
  }

  getAnalytics(): ParkingAnalytics {
    const total = this.slots.length || 1;
    const occupied = this.slots.filter((slot) => !slot.available).length;
    const greenTotal = this.slots.filter((slot) => slot.zone === "green").length || 1;
    const greenAvailable = this.slots.filter((slot) => slot.zone === "green" && slot.available).length;

    const heatmap: ZoneHeat[] = ["green", "standard"].map((zone) => {
      const zoneSlots = this.slots.filter((slot) => slot.zone === zone);
      const zoneOccupied = zoneSlots.filter((slot) => !slot.available).length;
      const zoneRate = zoneSlots.length === 0 ? 0 : Number(((zoneOccupied / zoneSlots.length) * 100).toFixed(2));
      return { zone, occupancyRate: zoneRate };
    }) as ZoneHeat[];

    return {
      occupancyRate: Number(((occupied / total) * 100).toFixed(2)),
      greenAvailabilityRate: Number(((greenAvailable / greenTotal) * 100).toFixed(2)),
      totalReports: this.reports.length,
      eventsInMemory: this.history.length,
      heatmap
    };
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

  private async persistSlotEvents(slots: Slot[]) {
    if (slots.length === 0) {
      return;
    }

    const records = slots.map((slot) =>
      this.slotEventsRepo.create({
        slotId: slot.id,
        zone: slot.zone,
        available: slot.available
      })
    );

    await this.slotEventsRepo.save(records);
  }
}
