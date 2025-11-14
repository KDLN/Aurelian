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

    // Validate request body (should be empty for this endpoint)
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        const body = await req.json();
        if (Object.keys(body).length > 0) {
          console.warn('[Onboarding] Dismiss endpoint received unexpected body:', body);
        }
      } catch (error) {
        // Invalid JSON - ignore and continue
        console.warn('[Onboarding] Dismiss endpoint received invalid JSON');
      }
    }

    // Use upsert for atomic create-or-update operation
    const session = await prisma.onboardingSession.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        dismissed: true,
        dismissedAt: new Date(),
        currentStep: 1,
        stepsCompleted: 0,
        totalGoldEarned: 0,
        totalItemsEarned: 0
      },
      update: {
        dismissed: true,
        dismissedAt: new Date()
      }
    });

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
