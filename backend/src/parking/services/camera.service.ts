import { Injectable } from "@nestjs/common";
import { CameraNode, Slot } from "../parking.types";

@Injectable()
export class CameraService {
  private readonly center = { lat: 10.772, lng: 106.698 };
  private cameras: CameraNode[] = this.generateInitialCameras(20);

  getAll(): CameraNode[] {
    return this.cameras;
  }

  simulate(timestamp: string): CameraNode[] {
    this.cameras = this.cameras.map((camera) => {
      const vehicles = Math.floor(Math.random() * 6);
      const status = Math.random() > 0.12 ? "online" : "offline";
      const latencyMs = Math.round(this.clamp(80 + Math.random() * 140 + (status === "offline" ? 90 : 0), 50, 450));

      return {
        ...camera,
        vehicles,
        status,
        latencyMs,
        updatedAt: timestamp
      };
    });

    return this.cameras;
  }

  applyToSlots(slots: Slot[]): Slot[] {
    if (this.cameras.length === 0) {
      return slots;
    }

    return slots.map((slot) => {
      const camera = this.cameras[slot.id % this.cameras.length];
      return {
        ...slot,
        cameraOnline: camera.status === "online"
      };
    });
  }

  private generateInitialCameras(count: number): CameraNode[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `CAM_${index + 1}`,
      lat: this.center.lat + (Math.random() - 0.5) * 0.012,
      lng: this.center.lng + (Math.random() - 0.5) * 0.012,
      status: "online",
      vehicles: Math.floor(Math.random() * 4),
      latencyMs: 100,
      updatedAt: new Date().toISOString()
    }));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
