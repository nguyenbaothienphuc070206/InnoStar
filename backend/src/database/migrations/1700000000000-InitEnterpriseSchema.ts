import { MigrationInterface, QueryRunner } from "typeorm";

export class InitEnterpriseSchema1700000000000 implements MigrationInterface {
  name = "InitEnterpriseSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "displayName" varchar NOT NULL DEFAULT 'Eco Traveler',
        role varchar(20) NOT NULL DEFAULT 'user',
        "ecoPoints" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS slot_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slotId" integer NOT NULL,
        zone varchar(16) NOT NULL,
        available boolean NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        method varchar(10) NOT NULL,
        path varchar(255) NOT NULL,
        "statusCode" integer NOT NULL,
        "actorId" varchar(50),
        "actorEmail" varchar(255),
        "requestId" varchar(80),
        metadata jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_slot_events_created_at ON slot_events ("createdAt");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_slot_events_zone_created_at ON slot_events (zone, "createdAt");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs ("createdAt");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs ("actorId");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS slot_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
