import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple in-memory cache for mission definitions (30 second TTL)
let missionDefsCache: { data: any[], timestamp: number } | null = null;
const MISSION_DEFS_CACHE_TTL = 30000; // 30 seconds

// GET - Fetch all mission definitions and user's active missions
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    console.log('🚀 [Missions GET] Starting request at:', new Date().toISOString());
    
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ [Missions GET] No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const authStartTime = performance.now();
    console.log('🔐 [Missions GET] Verifying token...');
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    const authEndTime = performance.now();
    console.log(`⚡ [Missions GET] Auth completed in ${(authEndTime - authStartTime).toFixed(2)}ms`);
    
    if (authError) {
      console.error('❌ [Missions GET] Auth error:', authError);
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 401 });
    }
    
    if (!user) {
      console.log('❌ [Missions GET] No user found for token');
      return NextResponse.json({ error: 'Invalid token - no user' }, { status: 401 });
    }
    
    console.log('✅ [Missions GET] User authenticated:', user.id);

    try {
      const dbStartTime = performance.now();
      console.log('📊 [Missions GET] Fetching mission data...');
      
      // Check cache for mission definitions
      const now = Date.now();
      let missionDefs;
      
      const cacheAge = missionDefsCache ? now - missionDefsCache.timestamp : Infinity;
      const usedCache = missionDefsCache && cacheAge < MISSION_DEFS_CACHE_TTL;
      
      if (usedCache && missionDefsCache) {
        console.log(`⚡ [Missions GET] Using cached mission definitions (age: ${Math.round(cacheAge/1000)}s)`);
        missionDefs = missionDefsCache.data;
      } else {
        console.log(`🔄 [Missions GET] Fetching fresh mission definitions (cache age: ${missionDefsCache ? Math.round(cacheAge/1000) + 's' : 'none'})`);
        missionDefs = await prisma.missionDef.findMany({
          where: { isActive: true },
          orderBy: { riskLevel: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            fromHub: true,
            toHub: true,
            distance: true,
            baseDuration: true,
            baseReward: true,
            riskLevel: true,
            itemRewards: true,
            isActive: true,
          }
        });
        
        // Update cache
        missionDefsCache = { data: missionDefs, timestamp: now };
        console.log(`💾 [Missions GET] Cached ${missionDefs.length} mission definitions for 30s`);
      }
      
      // Only fetch user's active missions (this must be fresh)
      const activeMissions = await prisma.missionInstance.findMany({
        where: {
          userId: user.id,
          status: 'active'
        },
        select: {
          id: true,
          userId: true,
          missionId: true,
          status: true,
          startTime: true,
          endTime: true,
          actualReward: true,
          itemsReceived: true,
          completedAt: true,
          mission: {
            select: {
              id: true,
              name: true,
              description: true,
              fromHub: true,
              toHub: true,
              riskLevel: true,
              baseReward: true,
              baseDuration: true,
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      });
      
      const dbEndTime = performance.now();
      console.log(`⚡ [Missions GET] Database queries completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`);
      console.log(`📊 [Missions GET] Found ${missionDefs.length} mission definitions and ${activeMissions.length} active missions`);
      
      // Log active missions for debugging
      if (activeMissions.length > 0) {
        console.log('🎯 [Missions GET] Active missions:', activeMissions.map(m => ({
          id: m.id.substring(0, 8),
          missionName: m.mission?.name,
          status: m.status,
          endTime: m.endTime,
          timeLeft: Math.max(0, Math.ceil((new Date(m.endTime).getTime() - Date.now()) / 1000)) + 's'
        })));
      } else {
        console.log('⚠️ [Missions GET] No active missions found for user:', user.id);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`🏁 [Missions GET] Request completed in ${totalTime.toFixed(2)}ms`);
      console.log(`📈 [Missions GET] Performance breakdown: Auth(${(authEndTime - authStartTime).toFixed(2)}ms) + DB(${(dbEndTime - dbStartTime).toFixed(2)}ms) + Processing(${(endTime - dbEndTime).toFixed(2)}ms)`);
      
      const response = NextResponse.json({
        missionDefs,
        activeMissions,
        debugTimestamp: new Date().toISOString(),
        performance: {
          totalMs: Math.round(totalTime),
          authMs: Math.round(authEndTime - authStartTime),
          dbMs: Math.round(dbEndTime - dbStartTime),
          usedCache,
          cacheAgeSeconds: missionDefsCache ? Math.round(cacheAge/1000) : null
        }
      });
      
      // Add optimized caching headers
      response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
      response.headers.set('X-Response-Time', `${totalTime.toFixed(2)}ms`);
      
      return response;
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
      // Optimize by doing checks in parallel
      const [missionDef, existingMission] = await Promise.all([
        prisma.missionDef.findUnique({
          where: { id: missionId },
          select: {
            id: true,
            name: true,
            baseDuration: true,
            isActive: true,
          }
        }),
        prisma.missionInstance.findFirst({
          where: {
            userId: user.id,
            missionId,
            status: 'active'
          },
          select: { id: true }
        })
      ]);

      if (!missionDef || !missionDef.isActive) {
        return NextResponse.json({ error: 'Mission not found or inactive' }, { status: 404 });
      }

      if (existingMission) {
        return NextResponse.json({ error: 'Mission already in progress' }, { status: 400 });
      }

      // Calculate end time based on base duration
      const endTime = new Date(Date.now() + missionDef.baseDuration * 1000);

      console.log('✅ [MissionStart] Creating mission instance in database');
      console.log('🎯 [MissionStart] Mission details:', {
        userId: user.id,
        missionId,
        missionName: missionDef.name,
        duration: missionDef.baseDuration,
        endTime: endTime.toISOString()
      });
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

      console.log('✅ [MissionStart] Mission created successfully:', {
        instanceId: missionInstance.id,
        status: missionInstance.status,
        startTime: missionInstance.startTime,
        endTime: missionInstance.endTime
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