import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const userId = user.id;

    // Get all active missions for this user
    const activeMissions = await prisma.missionInstance.findMany({
      where: {
        userId: userId,
        status: 'active'
      }
    });

    if (activeMissions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        updatedCount: 0,
        message: 'No active missions to speed up'
      });
    }

    // Set all active missions to complete in 2 seconds
    const newEndTime = new Date(Date.now() + 2000); // 2 seconds from now

    await prisma.missionInstance.updateMany({
      where: {
        userId: userId,
        status: 'active'
      },
      data: {
        endTime: newEndTime
      }
    });

    console.log(`🚀 DEBUG: Sped up ${activeMissions.length} missions for user ${userId}`);

    return NextResponse.json({
      success: true,
      updatedCount: activeMissions.length,
      message: `Set ${activeMissions.length} missions to complete in 2 seconds`
    });

  } catch (error) {
    console.error('Debug speedup error:', error);
    return NextResponse.json(
      { error: 'Failed to speed up missions' },
      { status: 500 }
    );
  }
}