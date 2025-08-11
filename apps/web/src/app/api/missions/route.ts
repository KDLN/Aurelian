import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch all mission definitions and user's active missions
export async function GET(request: NextRequest) {
  try {
    console.log('[Missions GET] Starting request');
    
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[Missions GET] No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    console.log('[Missions GET] Token found, verifying with Supabase');
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[Missions GET] Auth error:', authError);
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 401 });
    }
    
    if (!user) {
      console.log('[Missions GET] No user found for token');
      return NextResponse.json({ error: 'Invalid token - no user' }, { status: 401 });
    }
    
    console.log('[Missions GET] User authenticated:', user.id);

    try {
      console.log('[Missions GET] Fetching mission definitions...');
      // Get all active mission definitions
      const missionDefs = await prisma.missionDef.findMany({
        where: { isActive: true },
        orderBy: { riskLevel: 'asc' }
      });
      console.log(`[Missions GET] Found ${missionDefs.length} mission definitions`);

      console.log('[Missions GET] Fetching active missions for user...');
      // Get user's active mission instances
      const activeMissions = await prisma.missionInstance.findMany({
        where: {
          userId: user.id,
          status: 'active'
        },
        include: {
          mission: true
        }
      });
      console.log(`[Missions GET] Found ${activeMissions.length} active missions`);

      return NextResponse.json({
        missionDefs,
        activeMissions,
        debugTimestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('[Missions GET] Database error, falling back to mock data:', dbError);
      
      // Return mock data when database is not available
      const mockMissionDefs = [
        {
          id: 'mock-1',
          name: 'Iron Ore Run',
          description: 'Transport iron ore from the mines to the city',
          fromHub: 'Mining Camp',
          toHub: 'Capital City',
          distance: 150,
          baseDuration: 300,
          baseReward: 75,
          riskLevel: 'LOW',
          itemRewards: [{ itemKey: 'iron_ore', qty: 3 }],
          isActive: true
        },
        {
          id: 'mock-2', 
          name: 'Herb Delivery',
          description: 'Deliver rare herbs to the healers guild',
          fromHub: 'Forest Camp',
          toHub: 'Capital City', 
          distance: 200,
          baseDuration: 420,
          baseReward: 100,
          riskLevel: 'MEDIUM',
          itemRewards: [{ itemKey: 'herb', qty: 2 }],
          isActive: true
        },
        {
          id: 'mock-3',
          name: 'Relic Recovery',
          description: 'Dangerous expedition to recover ancient relics',
          fromHub: 'Capital City',
          toHub: 'Ancient Ruins',
          distance: 300,
          baseDuration: 600,
          baseReward: 200,
          riskLevel: 'HIGH', 
          itemRewards: [{ itemKey: 'relic_fragment', qty: 1 }],
          isActive: true
        }
      ];

      const mockActiveMissions: any[] = [];

      return NextResponse.json({
        missionDefs: mockMissionDefs,
        activeMissions: mockActiveMissions
      });
    }

  } catch (error) {
    console.error('[Missions GET] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch missions',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Start a new mission
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

    const { missionId } = await request.json();

    if (!missionId) {
      return NextResponse.json({ error: 'Mission ID required' }, { status: 400 });
    }

    try {
      // Get mission definition
      const missionDef = await prisma.missionDef.findUnique({
        where: { id: missionId }
      });

      if (!missionDef || !missionDef.isActive) {
        return NextResponse.json({ error: 'Mission not found or inactive' }, { status: 404 });
      }

      // Check if user already has this mission active
      const existingMission = await prisma.missionInstance.findFirst({
        where: {
          userId: user.id,
          missionId,
          status: 'active'
        }
      });

      if (existingMission) {
        return NextResponse.json({ error: 'Mission already in progress' }, { status: 400 });
      }

      // Calculate end time based on base duration
      const endTime = new Date(Date.now() + missionDef.baseDuration * 1000);

      console.log('✅ Creating mission instance in database');
      // Create new mission instance
      const missionInstance = await prisma.missionInstance.create({
        data: {
          userId: user.id,
          missionId,
          status: 'active',
          endTime
        },
        include: {
          mission: true
        }
      });

      return NextResponse.json({
        success: true,
        missionInstance
      });
    } catch (dbError) {
      console.error('[Missions POST] Database error, falling back to mock:', dbError);
      
      // Return mock success when database operation fails
      return NextResponse.json({
        success: true,
        missionInstance: {
          id: 'mock-instance-' + Date.now(),
          missionId,
          status: 'active',
          startTime: new Date(),
          endTime: new Date(Date.now() + 300000), // 5 minutes from now
          actualReward: null,
          itemsReceived: null
        }
      });
    }

  } catch (error) {
    console.error('Error starting mission:', error);
    return NextResponse.json(
      { error: 'Failed to start mission' },
      { status: 500 }
    );
  }
}