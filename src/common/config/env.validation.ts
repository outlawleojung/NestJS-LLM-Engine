import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsNumber()
  PORT?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNotEmpty()
  @IsString()
  REDIS_HOST!: string;

  @IsNumber()
  REDIS_PORT!: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(32, { message: 'SESSION_SECRET must be at least 32 characters' })
  SESSION_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  CLAUDE_MODEL!: string;

  @IsNotEmpty()
  @IsString()
  VOYAGE_MODEL!: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.toString()).join('\n'));
  }
  return validated;
}
