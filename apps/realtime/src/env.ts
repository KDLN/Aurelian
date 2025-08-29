import { z } from 'zod';

// Realtime server environment variables schema
const RealtimeEnvSchema = z.object({
  // Supabase configuration
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),
  SUPABASE_URL: z.string().url('Invalid SUPABASE_URL').optional(),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required').optional(),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required').optional(),
  
  // Server configuration
  PORT: z.string().default('8787').transform(val => parseInt(val, 10)),
  HOST: z.string().default('0.0.0.0'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional monitoring
  MONITOR_ENABLED: z.string().transform(val => val === 'true').default('false'),
});

export type RealtimeEnv = z.infer<typeof RealtimeEnvSchema>;

let parsedEnv: RealtimeEnv;

export function validateRealtimeEnv(): RealtimeEnv {
  if (parsedEnv) {
    return parsedEnv;
  }

  try {
    parsedEnv = RealtimeEnvSchema.parse(process.env);
    
    // Validate PORT is a valid number
    if (isNaN(parsedEnv.PORT) || parsedEnv.PORT < 1 || parsedEnv.PORT > 65535) {
      throw new Error('PORT must be a valid number between 1 and 65535');
    }
    
    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(
        `Missing or invalid realtime server environment variables:\n${missingVars.join('\n')}`
      );
    }
    throw error;
  }
}

// Export parsed environment variables
export const realtimeEnv = validateRealtimeEnv();