import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import axios from "axios";
import { ParkingGateway } from "./parking.gateway";
import { ParkingService } from "./parking.service";
import { Slot } from "./parking.types";

type DetectResponse = {
  slots?: Slot[];
  data?: {
    slots?: Slot[];
  };
};

@Injectable()
export class ParkingPoller implements OnModuleInit {
  private readonly logger = new Logger(ParkingPoller.name);
  private readonly aiUrl = process.env.AI_SERVICE_URL || "http://ai:8000";
  private readonly pollingMs = Number(process.env.POLLING_INTERVAL_MS || 2000);
  private failureStreak = 0;
  private circuitOpenUntil = 0;

  constructor(
    private readonly parkingService: ParkingService,
    private readonly parkingGateway: ParkingGateway
  ) {}

  onModuleInit() {
    this.parkingGateway.pushUpdate(this.parkingService.getAll());
    const initialTick = this.parkingService.simulateTick();
    this.parkingGateway.pushStream(initialTick.payload);
    this.parkingGateway.pushSlotDiff(initialTick.diff);

    setInterval(async () => {
      if (Date.now() < this.circuitOpenUntil) {
        this.logger.warn("AI circuit breaker open, skip polling cycle");
        return;
      }

      try {
        const data = await this.fetchWithRetry();
        const nextSlots = Array.isArray(data.data?.slots) ? data.data.slots : data.slots;
        if (Array.isArray(nextSlots)) {
          const updateResult = this.parkingService.update(nextSlots);
          this.parkingGateway.pushUpdate(updateResult.slots);
          this.parkingGateway.pushSlotDiff(updateResult.diff);
        }
        const tick = this.parkingService.simulateTick();
        this.parkingGateway.pushStream(tick.payload);
        this.parkingGateway.pushSlotDiff(tick.diff);
        this.failureStreak = 0;
      } catch (error) {
        this.failureStreak += 1;
        const tick = this.parkingService.simulateTick();
        this.parkingGateway.pushStream(tick.payload);
        this.parkingGateway.pushSlotDiff(tick.diff);
        if (this.failureStreak >= 3) {
          this.circuitOpenUntil = Date.now() + 20_000;
          this.logger.error("AI circuit breaker opened for 20s after repeated failures");
        }
        this.logger.warn("AI detect poll failed, keeping previous slots");
      }
    }, this.pollingMs);
  }

  private async fetchWithRetry(): Promise<DetectResponse> {
    const attempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const { data } = await axios.get<DetectResponse>(`${this.aiUrl}/detect`, {
          timeout: 3000
        });
        return data;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await this.delay(attempt * 300);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
