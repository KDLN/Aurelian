import { z } from 'zod';

// Database environment variables schema
const DatabaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;

let parsedEnv: DatabaseEnv;

export function validateDatabaseEnv(): DatabaseEnv {
  if (parsedEnv) {
    return parsedEnv;
  }

  try {
    parsedEnv = DatabaseEnvSchema.parse(process.env);
    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(
        `Missing or invalid database environment variables:\n${missingVars.join('\n')}`
      );
    }
    throw error;
  }
}

// Export parsed environment variables
export const databaseEnv = validateDatabaseEnv();