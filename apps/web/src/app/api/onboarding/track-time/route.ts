/**
 * POST /api/onboarding/track-time
 *
 * Track time spent on onboarding steps. Called periodically from client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user }
    } = await supabaseServer.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { stepKey, secondsSpent } = body;

    if (!stepKey || typeof secondsSpent !== 'number') {
      return NextResponse.json(
        { error: 'stepKey and secondsSpent are required' },
        { status: 400 }
      );
    }

    // Get step record
    const step = await prisma.onboardingStep.findUnique({
      where: { userId_stepKey: { userId: user.id, stepKey } }
    });

    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    // Only track time for IN_PROGRESS steps
    if (step.status !== 'IN_PROGRESS') {
      return NextResponse.json({
        success: false,
        message: 'Can only track time for in-progress steps'
      });
    }

    // Update time spent
    await prisma.onboardingStep.update({
      where: { userId_stepKey: { userId: user.id, stepKey } },
      data: {
        timeSpentSec: { increment: secondsSpent }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Time tracked successfully'
    });
  } catch (error) {
    console.error('Failed to track time:', error);
    return NextResponse.json(
      { error: 'Failed to track time' },
      { status: 500 }
    );
  }
}
