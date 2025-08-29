import { z } from 'zod';

// Web app environment variables schema
const WebEnvSchema = z.object({
  // Next.js public variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_WS_URL: z.string().url('Invalid NEXT_PUBLIC_WS_URL').default('ws://localhost:8787'),
  
  // Server-side variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  
  // Database (inherited from database package)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required').optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Next.js internal
  VERCEL_URL: z.string().optional(),
  PORT: z.string().default('3000'),
});

export type WebEnv = z.infer<typeof WebEnvSchema>;

let parsedEnv: WebEnv;

export function validateWebEnv(): WebEnv {
  if (parsedEnv) {
    return parsedEnv;
  }

  try {
    parsedEnv = WebEnvSchema.parse(process.env);
    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(
        `Missing or invalid web app environment variables:\n${missingVars.join('\n')}`
      );
    }
    throw error;
  }
}

// Export parsed environment variables
export const webEnv = validateWebEnv();