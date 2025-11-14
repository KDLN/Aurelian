/**
 * POST /api/onboarding/dismiss
 *
 * Dismiss the onboarding tutorial. User can still complete steps but the panel won't show.
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

    // Get or create session
    let session = await prisma.onboardingSession.findUnique({
      where: { userId: user.id }
    });

    // Validate session ownership (defense in depth)
    if (session && session.userId !== user.id) {
      console.error('[Onboarding] Session ownership mismatch:', {
        sessionUserId: session.userId,
        requestUserId: user.id
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!session) {
      // Create session if it doesn't exist (user dismissed before starting)
      session = await prisma.onboardingSession.create({
        data: {
          userId: user.id,
          dismissed: true,
          dismissedAt: new Date(),
          currentStep: 1,
          stepsCompleted: 0,
          totalGoldEarned: 0,
          totalItemsEarned: 0
        }
      });
    } else {
      // Update existing session
      session = await prisma.onboardingSession.update({
        where: { userId: user.id },
        data: {
          dismissed: true,
          dismissedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding dismissed',
      session
    });
  } catch (error) {
    console.error('[Onboarding] Failed to dismiss onboarding:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: 'Failed to dismiss onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
