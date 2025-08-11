import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Load user's avatar/character appearance
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

    // Get user's profile with avatar data
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { avatar: true, display: true }
    });

    if (!profile) {
      // Return default if no profile exists
      return NextResponse.json({
        avatar: null,
        display: 'Trader'
      });
    }

    return NextResponse.json({
      avatar: profile.avatar,
      display: profile.display
    });

  } catch (error) {
    console.error('Error loading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to load avatar' },
      { status: 500 }
    );
  }
}

// POST - Save user's avatar/character appearance
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

    // Get avatar data from request body
    const { avatar, display } = await request.json();

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar data required' }, { status: 400 });
    }

    // Update or create profile with avatar data
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        avatar,
        display: display || avatar.name || 'Trader',
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        avatar,
        display: display || avatar.name || 'Trader'
      }
    });

    return NextResponse.json({
      success: true,
      profile: {
        avatar: profile.avatar,
        display: profile.display
      }
    });

  } catch (error) {
    console.error('Error saving avatar:', error);
    return NextResponse.json(
      { error: 'Failed to save avatar' },
      { status: 500 }
    );
  }
}