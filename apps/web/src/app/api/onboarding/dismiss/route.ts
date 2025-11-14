/**
 * POST /api/onboarding/dismiss
 *
 * Dismiss the onboarding tutorial. User can still complete steps but the panel won't show.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create session
    let session = await prisma.onboardingSession.findUnique({
      where: { userId: user.id }
    });

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
    console.error('Failed to dismiss onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss onboarding' },
      { status: 500 }
    );
  }
}
