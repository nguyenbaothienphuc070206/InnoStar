import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, Worker } from "bullmq";
import { RegisterCameraDto } from "./dto/register-camera.dto";

type CameraItem = {
  id: string;
  streamUrl: string;
  zone: string;
  registeredAt: string;
};

@Injectable()
export class CameraService implements OnModuleDestroy {
  private readonly logger = new Logger(CameraService.name);
  private readonly cameras = new Map<string, CameraItem>();
  private readonly queue: Queue;
  private readonly worker: Worker;

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>("REDIS_HOST", "redis");
    const redisPort = Number(this.configService.get<string>("REDIS_PORT", "6379"));

    this.queue = new Queue("camera-ingest", {
      connection: { host: redisHost, port: redisPort }
    });

    this.worker = new Worker(
      "camera-ingest",
      async (job) => {
        this.logger.log(`Processing camera ${job.data.cameraId} frame at ${job.data.timestamp}`);
      },
      {
        connection: { host: redisHost, port: redisPort }
      }
    );
  }

  async register(dto: RegisterCameraDto) {
    const item: CameraItem = {
      id: dto.id,
      streamUrl: dto.streamUrl,
      zone: dto.zone,
      registeredAt: new Date().toISOString()
    };
    this.cameras.set(dto.id, item);
    await this.queue.add("camera-registered", { cameraId: dto.id, streamUrl: dto.streamUrl, timestamp: Date.now() });
    return item;
  }

  list() {
    return Array.from(this.cameras.values());
  }

  async syncAll() {
    const batch = Array.from(this.cameras.values());
    await Promise.all(
      batch.map((camera) =>
        this.queue.add("camera-sync", {
          cameraId: camera.id,
          streamUrl: camera.streamUrl,
          timestamp: Date.now()
        })
      )
    );
    return {
      queued: batch.length,
      at: new Date().toISOString()
    };
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
  }
}
