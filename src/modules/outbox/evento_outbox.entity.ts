import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'evento_outbox' })
export class EventoOutbox {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'aggregate_id', length: 100 })
  aggregateId: string;

  @Column({ length: 100 })
  type: string;

  @Column('jsonb')
  payload: any;

  @Column({ default: false })
  processed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;
}
