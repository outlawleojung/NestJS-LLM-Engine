import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1753574400000 implements MigrationInterface {
  name = 'CreateProducts1753574400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "category" varchar(100) NOT NULL,
        "features" text NOT NULL,
        "embedding" vector(1024),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_products_name" ON "products" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products" ("category")`);

    // ivfflat 인덱스는 데이터가 어느 정도 쌓인 뒤 재생성하는 것이 효과적이지만,
    // 데모/포트폴리오 규모에서는 생성 시점에 만들어도 무방.
    await queryRunner.query(`
      CREATE INDEX "IDX_products_embedding" ON "products"
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_embedding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_name"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
