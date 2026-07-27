import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiRequests1753574500000 implements MigrationInterface {
  name = 'CreateAiRequests1753574500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ai_request_type_enum" AS ENUM ('COPY_GENERATION', 'QA')
    `);
    await queryRunner.query(`
      CREATE TYPE "ai_request_status_enum" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_id" varchar(64) NOT NULL,
        "type" "ai_request_type_enum" NOT NULL,
        "status" "ai_request_status_enum" NOT NULL DEFAULT 'PENDING',
        "input" jsonb NOT NULL,
        "output" text,
        "error_message" text,
        "input_tokens" integer,
        "output_tokens" integer,
        "cost" numeric(12,6),
        "retry_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        CONSTRAINT "PK_ai_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_requests_request_id" UNIQUE ("request_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_ai_requests_request_id" ON "ai_requests" ("request_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_requests_type" ON "ai_requests" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_requests_status" ON "ai_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_requests_created_at" ON "ai_requests" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_requests_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_requests_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_requests_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_requests_request_id"`);
    await queryRunner.query(`DROP TABLE "ai_requests"`);
    await queryRunner.query(`DROP TYPE "ai_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "ai_request_type_enum"`);
  }
}
