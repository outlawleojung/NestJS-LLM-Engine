import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  category!: string;

  @Column({ type: 'text' })
  features!: string;

  // pgvector column — voyage-3 → 1024 dimensions
  // TypeORM has no native vector type; declare as `unknown` and cast in queries.
  @Column({
    type: 'vector' as unknown as 'text',
    nullable: true,
    transformer: {
      to: (value: number[] | null): string | null =>
        value ? `[${value.join(',')}]` : null,
      from: (value: string | null): number[] | null =>
        value ? (JSON.parse(value) as number[]) : null,
    },
  })
  embedding!: number[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
