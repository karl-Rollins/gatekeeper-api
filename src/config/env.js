import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_TEST: z.string().min(1, 'DATABASE_URL_TEST is required'),
  DB_POOL_MAX: z.coerce.number().int().min(5, 'DB_POOL_MAX must be at least 5').default(10),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formattedErrors = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${formattedErrors}`);
  }

  return Object.freeze({
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    databaseUrlTest: parsed.data.DATABASE_URL_TEST,
    dbPoolMax: parsed.data.DB_POOL_MAX,
  });
}

export const config = loadConfig();