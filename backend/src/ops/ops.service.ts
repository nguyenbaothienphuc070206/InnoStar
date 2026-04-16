import { Injectable } from "@nestjs/common";
import axios from "axios";
import Redis from "ioredis";
import { DataSource } from "typeorm";

@Injectable()
export class OpsService {
  constructor(private readonly dataSource: DataSource) {}

  async health() {
    const db = await this.pingDatabase();
    const redis = await this.pingRedis();
    const ai = await this.pingAi();

    const healthy = db.ok && redis.ok && ai.ok;

    return {
      status: healthy ? "ok" : "degraded",
      checks: { db, redis, ai },
      timestamp: new Date().toISOString()
    };
  }

  async readiness() {
    const db = await this.pingDatabase();
    return {
      ready: db.ok,
      dependencies: { db },
      timestamp: new Date().toISOString()
    };
  }

  private async pingDatabase() {
    try {
      await this.dataSource.query("SELECT 1");
      return { ok: true };
    } catch (error) {
      return { ok: false, message: "db_unreachable" };
    }
  }

  private async pingRedis() {
    const redisHost = process.env.REDIS_HOST || "redis";
    const redisPort = Number(process.env.REDIS_PORT || "6379");
    const redis = new Redis({ host: redisHost, port: redisPort, maxRetriesPerRequest: 1 });

    try {
      const pong = await redis.ping();
      return { ok: pong === "PONG" };
    } catch {
      return { ok: false, message: "redis_unreachable" };
    } finally {
      redis.disconnect();
    }
  }

  private async pingAi() {
    const aiBase = process.env.AI_SERVICE_URL || "http://ai:8000";
    try {
      const response = await axios.get(`${aiBase}/health`, { timeout: 2500 });
      return { ok: response.status === 200 };
    } catch {
      return { ok: false, message: "ai_unreachable" };
    }
  }
}
