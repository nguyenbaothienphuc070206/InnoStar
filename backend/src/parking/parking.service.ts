import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  HistoryPoint,
  ParkingAnalytics,
  ParkingStreamPayload,
  RouteResult,
  Slot,
  SlotDiff,
  SlotPrediction
} from "./parking.types";
import { SlotEventEntity } from "./entities/slot-event.entity";
import { Repository } from "typeorm";
import { SlotService } from "./services/slot.service";
import { CameraService } from "./services/camera.service";
import { RouteService } from "./services/route.service";
import { SimulationEngineService } from "./services/simulation-engine.service";

@Injectable()
export class ParkingService {
  private reports: Array<{ user: string; message: string; createdAt: string }> = [];
  private streamHistory: HistoryPoint[] = [];
  private incidents: ParkingStreamPayload["incidents"] = [];
  private ecoPoints: Record<string, number> = {
    "Eco Traveler": 240,
    Minh: 180,
    An: 165
  };

  constructor(
    @InjectRepository(SlotEventEntity)
    private readonly slotEventsRepo: Repository<SlotEventEntity>,
    private readonly slotService: SlotService,
    private readonly cameraService: CameraService,
    private readonly routeService: RouteService,
    private readonly simulationEngine: SimulationEngineService
  ) {
    const linked = this.cameraService.applyToSlots(this.slotService.getAll());
    this.slotService.setAll(linked);
  }

  getAll(): Slot[] {
    return this.slotService.getAll();
  }

  update(newSlots: Slot[]): { slots: Slot[]; diff: SlotDiff[] } {
    const prev = this.slotService.getAll();
    const linked = this.cameraService.applyToSlots(newSlots);
    const next = this.slotService.setAll(linked);
    const diff = this.slotService.computeDiff(prev, next);
    this.persistSlotEvents(next).catch(() => null);
    return { slots: next, diff };
  }

  simulateTick(): { payload: ParkingStreamPayload; diff: SlotDiff[] } {
    const now = new Date().toISOString();
    const traffic = this.simulationEngine.simulateTraffic();
    const prev = this.slotService.getAll();

    const slotResult = this.simulationEngine.simulateSlots(prev, now, traffic);
    this.cameraService.simulate(now);
    const linkedSlots = this.cameraService.applyToSlots(slotResult.slots);
    const slots = this.slotService.setSimulated(linkedSlots, now);
    const diff = this.slotService.computeDiff(prev, slots);

    const users = this.simulationEngine.simulateUsers();
    const cameras = this.cameraService.getAll();
    const metrics = this.simulationEngine.getMetrics(slots, traffic);

    this.streamHistory.push({
      time: now,
      availability: metrics.availability,
      traffic
    });
    this.streamHistory = this.streamHistory.slice(-120);

    this.incidents = this.simulationEngine.detectIncidents(now, metrics, cameras, slotResult.events);

    this.persistSlotEvents(slots).catch(() => null);

    return {
      payload: {
        event: "CITY_TICK",
        timestamp: now,
        slots,
        users,
        cameras,
        metrics,
        incidents: this.incidents,
        history: this.streamHistory,
        events: slotResult.events
      },
      diff
    };
  }

  getRouteOptions(fromLat: number, fromLng: number, toLat: number, toLng: number) {
    const traffic = this.simulationEngine.simulateTraffic();
    return this.routeService.getRouteOptions(fromLat, fromLng, toLat, toLng, traffic);
  }

  getGreenRoute(destination: string): RouteResult {
    return this.routeService.getGreenRoute(destination, this.slotService.getAll());
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
    return {
      occupancyRate: this.slotService.getOccupancyRate(),
      greenAvailabilityRate: this.slotService.getGreenAvailabilityRate(),
      totalReports: this.reports.length,
      eventsInMemory: this.slotService.getHistoryCount(),
      heatmap: this.slotService.getZoneHeat()
    };
  }

  getPredictions(): SlotPrediction[] {
    return this.slotService.getPredictions();
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
