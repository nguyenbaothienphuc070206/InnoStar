import "reflect-metadata";
import { DataSource } from "typeorm";
import { AuditLogEntity } from "../common/audit/entities/audit-log.entity";
import { SlotEventEntity } from "../parking/entities/slot-event.entity";
import { UserEntity } from "../users/entities/user.entity";

export default new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || "5432"),
  username: process.env.POSTGRES_USER || "greenpark",
  password: process.env.POSTGRES_PASSWORD || "greenpark",
  database: process.env.POSTGRES_DB || "greenpark",
  synchronize: false,
  migrationsRun: false,
  entities: [UserEntity, SlotEventEntity, AuditLogEntity],
  migrations: ["src/database/migrations/*.ts", "dist/database/migrations/*.js"]
});
