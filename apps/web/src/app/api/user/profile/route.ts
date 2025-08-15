import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [UserProfile] GET API called at:', new Date().toISOString());
    
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

    console.log('✅ [UserProfile] Fetching profile for user:', user.id);

    try {
      // Fetch the profile
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { display: true }
      });

      console.log('✅ [UserProfile] Profile fetched:', profile);

      return NextResponse.json({
        success: true,
        profile: profile
      });

    } catch (dbError) {
      console.error('[UserProfile] Database error:', dbError);
      
      return NextResponse.json({
        error: 'Failed to fetch profile',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// POST - Update user profile
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [UserProfile] API called at:', new Date().toISOString());
    
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

    const { userId, display } = await request.json();

    // Verify the user is updating their own profile
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('✅ [UserProfile] Updating profile for user:', user.id, 'display:', display);

    try {
      // First ensure the user exists in our database
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          updatedAt: new Date()
        },
        create: {
          id: user.id,
          email: user.email || 'unknown@example.com',
          caravanSlotsUnlocked: 3,
          caravanSlotsPremium: 0,
          craftingLevel: 1,
          craftingXP: 0,
          craftingXPNext: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Check if display name is already taken by another user
      const existingProfile = await prisma.profile.findFirst({
        where: {
          display: display,
          userId: { not: user.id }
        }
      });

      if (existingProfile) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }

      // Ensure wallet exists
      await prisma.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          gold: 2000
        }
      });

      // Update the profile (now that user exists)
      const updatedProfile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: { display: display },
        create: { 
          userId: user.id, 
          display: display 
        }
      });

      console.log('✅ [UserProfile] Profile updated successfully');

      return NextResponse.json({
        success: true,
        profile: updatedProfile
      });

    } catch (dbError) {
      console.error('[UserProfile] Database error:', dbError);
      
      // Handle specific database errors
      if (dbError instanceof Error && dbError.message.includes('23505')) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }
      
      return NextResponse.json({
        error: 'Failed to update profile',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}