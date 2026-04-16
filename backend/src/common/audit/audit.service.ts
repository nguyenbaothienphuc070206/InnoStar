import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogEntity } from "./entities/audit-log.entity";

type AuditPayload = {
  method: string;
  path: string;
  statusCode: number;
  actorId?: string | null;
  actorEmail?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>
  ) {}

  async write(payload: AuditPayload): Promise<void> {
    const entry = this.auditRepo.create({
      method: payload.method,
      path: payload.path,
      statusCode: payload.statusCode,
      actorId: payload.actorId ?? null,
      actorEmail: payload.actorEmail ?? null,
      requestId: payload.requestId ?? null,
      metadata: payload.metadata ?? null
    });

    await this.auditRepo.save(entry);
  }
}
