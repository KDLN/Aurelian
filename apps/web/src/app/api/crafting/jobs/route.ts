import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.sub;

    // Get all craft jobs for the user
    const craftJobs = await prisma.craftJob.findMany({
      where: {
        userId: userId,
        status: { in: ['queued', 'running'] }
      },
      include: {
        blueprint: {
          include: {
            output: {
              select: {
                id: true,
                key: true,
                name: true,
                rarity: true
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // queued first, then running
        { eta: 'asc' }     // earliest completion first
      ]
    });

    // Calculate progress for each job
    const jobsWithProgress = craftJobs.map(job => {
      const now = Date.now();
      const started = job.startedAt ? job.startedAt.getTime() : now;
      const eta = job.eta.getTime();
      const totalDuration = eta - started;
      const elapsed = now - started;
      
      let progress = 0;
      let timeRemaining = 0;
      let isComplete = false;

      if (job.status === 'running') {
        progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        timeRemaining = Math.max(0, eta - now);
        isComplete = now >= eta;
      }

      return {
        ...job,
        progress: Math.round(progress * 10) / 10, // Round to 1 decimal
        timeRemainingMs: timeRemaining,
        timeRemainingMinutes: Math.ceil(timeRemaining / (1000 * 60)),
        isComplete,
        canComplete: isComplete && job.status === 'running'
      };
    });

    // Get completed jobs that haven't been collected yet
    const completedJobs = await prisma.craftJob.findMany({
      where: {
        userId: userId,
        status: 'complete'
      },
      include: {
        blueprint: {
          include: {
            output: {
              select: {
                id: true,
                key: true,
                name: true,
                rarity: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10 // Limit to last 10 completed jobs
    });

    return NextResponse.json({
      activeJobs: jobsWithProgress,
      completedJobs: completedJobs,
      summary: {
        total: jobsWithProgress.length,
        inProgress: jobsWithProgress.filter(j => j.status === 'running').length,
        queued: jobsWithProgress.filter(j => j.status === 'queued').length,
        readyToComplete: jobsWithProgress.filter(j => j.canComplete).length
      }
    });

  } catch (error) {
    console.error('Get craft jobs error:', error);
    return NextResponse.json({
      error: 'Failed to fetch craft jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}