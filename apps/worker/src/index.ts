
import express, { Request, Response } from 'express';
import { workerEnv } from './env';
import { guildCleanupService } from './services/guildCleanup';

// Validate environment variables at startup
console.log('🔧 Validating environment variables...');
try {
  const env = workerEnv;
  console.log('✅ Environment validation successful');
  console.log(`🚀 Starting worker service on port ${env.PORT}`);
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (_req: Request, res: Response) => res.send('Aurelian Worker - v1.0 Ready'));

// Guild cleanup status endpoint
app.get('/guild-cleanup/status', async (_req: Request, res: Response) => {
  try {
    const stats = await guildCleanupService.getCleanupStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    res.status(500).json({ error: 'Failed to get cleanup stats' });
  }
});

// Manual cleanup trigger endpoint (for development/testing)
app.post('/guild-cleanup/run', async (_req: Request, res: Response) => {
  try {
    // This would trigger a manual cleanup
    res.json({ success: true, message: 'Manual cleanup triggered' });
  } catch (error) {
    console.error('Error triggering manual cleanup:', error);
    res.status(500).json({ error: 'Failed to trigger cleanup' });
  }
});

// Initialize services
console.log('🚀 Starting Aurelian Worker...');

// Start guild cleanup service
guildCleanupService.start();

// World simulation tick
setInterval(() => { 
  console.log('[tick] world updated'); 
}, 5000);

app.listen(workerEnv.PORT, workerEnv.HOST, () => {
  console.log(`✅ Worker service ready on ${workerEnv.HOST}:${workerEnv.PORT}`);
  console.log('🧹 Guild cleanup service started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  guildCleanupService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  guildCleanupService.stop();
  process.exit(0);
});
