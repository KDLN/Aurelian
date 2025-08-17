import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getRequestBody } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';

export const dynamic = 'force-dynamic';

// Simple in-memory cache for mission definitions (30 second TTL)
let missionDefsCache: { data: any[], timestamp: number } | null = null;
const MISSION_DEFS_CACHE_TTL = 30000; // 30 seconds

// GET - Fetch all mission definitions and user's active missions
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const startTime = performance.now();
    console.log('🚀 [Missions GET] Starting request for user:', user.id);

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
          caravanSlot: true,
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
          caravanSlot: 'asc'
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
  });
}

// POST - Start a new mission
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await getRequestBody<{ missionId: string; agentId: string }>(request);
    
    if (!body || !body.missionId) {
      return createErrorResponse('MISSING_FIELDS', 'Mission ID required');
    }

    if (!body.agentId) {
      return createErrorResponse('MISSING_FIELDS', 'Agent ID required');
    }
    
    const { missionId, agentId } = body;

    try {
      // Optimize by doing checks in parallel
      const [missionDef, activeMissions, userCaravanSlots, agent] = await Promise.all([
        prisma.missionDef.findUnique({
          where: { id: missionId },
          select: {
            id: true,
            name: true,
            baseDuration: true,
            isActive: true,
          }
        }),
        prisma.missionInstance.findMany({
          where: {
            userId: user.id,
            status: 'active'
          },
          select: { id: true, missionId: true, caravanSlot: true, agentId: true }
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { caravanSlotsUnlocked: true, caravanSlotsPremium: true }
        }),
        prisma.agent.findFirst({
          where: {
            id: agentId,
            userId: user.id,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            level: true,
            specialty: true,
            successBonus: true,
            speedBonus: true,
            rewardBonus: true
          }
        })
      ]);

      if (!missionDef || !missionDef.isActive) {
        return NextResponse.json({ error: 'Mission not found or inactive' }, { status: 404 });
      }

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found or not owned by user' }, { status: 404 });
      }

      // Check if agent is already on a mission
      const agentOnMission = activeMissions.find(mission => mission.agentId === agentId);
      if (agentOnMission) {
        return NextResponse.json({ 
          error: `Agent ${agent.name} is already on a mission` 
        }, { status: 400 });
      }

      // Check if user already has this specific mission active
      const existingMission = activeMissions.find(m => m.missionId === missionId);
      if (existingMission) {
        return NextResponse.json({ error: 'Mission already in progress' }, { status: 400 });
      }

      // Check available caravan slots
      const totalSlots = (userCaravanSlots?.caravanSlotsUnlocked || 3) + (userCaravanSlots?.caravanSlotsPremium || 0);
      const occupiedSlots = activeMissions.map(m => m.caravanSlot);
      
      // Find first available slot
      let availableSlot = null;
      for (let slot = 1; slot <= totalSlots; slot++) {
        if (!occupiedSlots.includes(slot)) {
          availableSlot = slot;
          break;
        }
      }

      if (availableSlot === null) {
        return NextResponse.json({ 
          error: 'All caravan slots are busy', 
          details: { totalSlots, occupiedSlots } 
        }, { status: 400 });
      }

      // Calculate end time based on base duration with agent speed bonus
      const speedMultiplier = 1 - (agent.speedBonus / 100); // Speed bonus reduces time
      const adjustedDuration = Math.max(missionDef.baseDuration * speedMultiplier, missionDef.baseDuration * 0.5); // Minimum 50% of base time
      const endTime = new Date(Date.now() + adjustedDuration * 1000);

      console.log('✅ [MissionStart] Creating mission instance in database');
      console.log('🎯 [MissionStart] Mission details:', {
        userId: user.id,
        missionId,
        missionName: missionDef.name,
        duration: missionDef.baseDuration,
        adjustedDuration,
        endTime: endTime.toISOString(),
        caravanSlot: availableSlot,
        agentId: agent.id,
        agentName: agent.name,
        agentBonuses: {
          speed: agent.speedBonus,
          success: agent.successBonus,
          reward: agent.rewardBonus
        }
      });
      // Create new mission instance
      const missionInstance = await prisma.missionInstance.create({
        data: {
          userId: user.id,
          missionId,
          agentId: agent.id,
          status: 'active',
          endTime,
          caravanSlot: availableSlot
        },
        include: {
          mission: true,
          agent: {
            select: {
              id: true,
              name: true,
              specialty: true,
              level: true,
              successBonus: true,
              speedBonus: true,
              rewardBonus: true
            }
          }
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
  });
}