import { z } from 'zod';

// Worker service environment variables schema
const WorkerEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required').optional(),
  
  // Server configuration
  PORT: z.string().default('8080').transform(val => parseInt(val, 10)),
  HOST: z.string().default('0.0.0.0'),
  
  // Worker-specific configuration
  WORLD_SIMULATION_INTERVAL: z.string().default('60000').transform(val => parseInt(val, 10)), // 1 minute
  MARKET_UPDATE_INTERVAL: z.string().default('5000').transform(val => parseInt(val, 10)),   // 5 seconds
  CLEANUP_INTERVAL: z.string().default('3600000').transform(val => parseInt(val, 10)),      // 1 hour
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional features
  ENABLE_MARKET_SIMULATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_WORLD_EVENTS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CLEANUP_TASKS: z.string().transform(val => val === 'true').default('true'),
});

export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;

let parsedEnv: WorkerEnv;

export function validateWorkerEnv(): WorkerEnv {
  if (parsedEnv) {
    return parsedEnv;
  }

  try {
    parsedEnv = WorkerEnvSchema.parse(process.env);
    
    // Validate PORT is a valid number
    if (isNaN(parsedEnv.PORT) || parsedEnv.PORT < 1 || parsedEnv.PORT > 65535) {
      throw new Error('PORT must be a valid number between 1 and 65535');
    }
    
    // Validate intervals are positive
    if (parsedEnv.WORLD_SIMULATION_INTERVAL < 1000) {
      throw new Error('WORLD_SIMULATION_INTERVAL must be at least 1000ms');
    }
    if (parsedEnv.MARKET_UPDATE_INTERVAL < 1000) {
      throw new Error('MARKET_UPDATE_INTERVAL must be at least 1000ms');
    }
    if (parsedEnv.CLEANUP_INTERVAL < 60000) {
      throw new Error('CLEANUP_INTERVAL must be at least 60000ms (1 minute)');
    }
    
    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(
        `Missing or invalid worker service environment variables:\n${missingVars.join('\n')}`
      );
    }
    throw error;
  }
}

// Export parsed environment variables
export const workerEnv = validateWorkerEnv();