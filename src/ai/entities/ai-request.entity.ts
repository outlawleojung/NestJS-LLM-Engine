import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AiRequestType {
  COPY_GENERATION = 'COPY_GENERATION',
  QA = 'QA',
}

export enum AiRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('ai_requests')
export class AiRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64, unique: true })
  @Index()
  requestId!: string;

  @Column({ type: 'enum', enum: AiRequestType })
  @Index()
  type!: AiRequestType;

  @Column({ type: 'enum', enum: AiRequestStatus, default: AiRequestStatus.PENDING })
  @Index()
  status!: AiRequestStatus;

  @Column({ type: 'jsonb' })
  input!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  output!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'input_tokens', type: 'int', nullable: true })
  inputTokens!: number | null;

  @Column({ name: 'output_tokens', type: 'int', nullable: true })
  outputTokens!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  cost!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
