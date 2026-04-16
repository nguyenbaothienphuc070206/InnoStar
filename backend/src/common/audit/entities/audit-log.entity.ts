import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "audit_logs" })
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 10 })
  method!: string;

  @Column({ type: "varchar", length: 255 })
  path!: string;

  @Column({ type: "int" })
  statusCode!: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  actorId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  actorEmail!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  requestId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
