import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Load user's onboarding progress
export async function GET(request: NextRequest) {
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's profile with onboarding progress
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { onboardingProgress: true }
    });

    return NextResponse.json({
      onboardingProgress: profile?.onboardingProgress || null
    });

  } catch (error) {
    console.error('Error loading onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to load onboarding progress' },
      { status: 500 }
    );
  }
}

// POST - Save user's onboarding progress
export async function POST(request: NextRequest) {
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get onboarding progress from request body
    const { onboardingProgress } = await request.json();

    if (!onboardingProgress) {
      return NextResponse.json({ error: 'Onboarding progress data required' }, { status: 400 });
    }

    // Update profile with onboarding progress
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        onboardingProgress,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        display: user.email?.split('@')[0] || 'Anonymous',
        onboardingProgress
      }
    });

    return NextResponse.json({
      success: true,
      onboardingProgress: profile.onboardingProgress
    });

  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding progress' },
      { status: 500 }
    );
  }
}