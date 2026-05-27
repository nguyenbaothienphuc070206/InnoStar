import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "slot_events" })
export class SlotEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "int" })
  slotId!: number;

  @Column({ type: "varchar", length: 16 })
  zone!: "green" | "standard";

  @Column({ type: "bool" })
  available!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
