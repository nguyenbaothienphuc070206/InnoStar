import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";
import { AuthModule } from "./auth/auth.module";
import { RolesGuard } from "./auth/rbac/roles.guard";
import { CameraModule } from "./camera/camera.module";
import { AuditInterceptor } from "./common/audit/audit.interceptor";
import { AuditModule } from "./common/audit/audit.module";
import { AuditLogEntity } from "./common/audit/entities/audit-log.entity";
import { OpsModule } from "./ops/ops.module";
import { ParkingModule } from "./parking/parking.module";
import { SlotEventEntity } from "./parking/entities/slot-event.entity";
import { UserEntity } from "./users/entities/user.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3001),
        AI_SERVICE_URL: Joi.string().required(),
        POLLING_INTERVAL_MS: Joi.number().default(2000),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        DB_SYNCHRONIZE: Joi.boolean().default(false),
        DB_MIGRATIONS_RUN: Joi.boolean().default(true)
      })
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120
      }
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("POSTGRES_HOST", "postgres"),
        port: Number(config.get<string>("POSTGRES_PORT", "5432")),
        username: config.get<string>("POSTGRES_USER", "greenpark"),
        password: config.get<string>("POSTGRES_PASSWORD", "greenpark"),
        database: config.get<string>("POSTGRES_DB", "greenpark"),
        synchronize: config.get<string>("DB_SYNCHRONIZE", "false") === "true",
        migrationsRun: config.get<string>("DB_MIGRATIONS_RUN", "true") === "true",
        entities: [UserEntity, SlotEventEntity, AuditLogEntity],
        migrations: ["src/database/migrations/*.ts", "dist/database/migrations/*.js"]
      })
    }),
    AuthModule,
    CameraModule,
    AuditModule,
    OpsModule,
    ParkingModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
