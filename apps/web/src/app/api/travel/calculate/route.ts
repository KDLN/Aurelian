import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check if two guilds are allies
async function checkAllianceStatus(guildId1: string, guildId2: string): Promise<{
  isAllied: boolean;
  travelTaxReduction: number;
}> {
  const alliance = await prisma.guildAlliance.findFirst({
    where: {
      OR: [
        { fromGuildId: guildId1, toGuildId: guildId2 },
        { fromGuildId: guildId2, toGuildId: guildId1 }
      ],
      status: 'ACCEPTED',
      type: 'ALLIANCE'
    },
    select: {
      travelTaxReduction: true
    }
  });

  return {
    isAllied: !!alliance,
    travelTaxReduction: alliance?.travelTaxReduction || 0
  };
}

// POST - Calculate travel costs with alliance benefits
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { fromHubId, toHubId, cargoValue } = await request.json();

    if (!fromHubId || !toHubId) {
      return NextResponse.json({ 
        error: 'From and to hub IDs are required' 
      }, { status: 400 });
    }

    // Get user's guild membership
    const membership = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      select: { 
        guildId: true, 
        guild: { select: { id: true, name: true, tag: true } } 
      }
    });

    // Get the hubs and their controlling guilds
    const fromHub = await prisma.hub.findUnique({
      where: { id: fromHubId },
      select: { id: true, key: true, name: true }
    });

    const toHub = await prisma.hub.findUnique({
      where: { id: toHubId },
      select: { id: true, key: true, name: true }
    });

    if (!fromHub || !toHub) {
      return NextResponse.json({ 
        error: 'One or both hubs not found' 
      }, { status: 404 });
    }

    // Find the road/link between the hubs
    const road = await prisma.link.findFirst({
      where: {
        OR: [
          { aId: fromHubId, bId: toHubId },
          { aId: toHubId, bId: fromHubId }
        ]
      },
      select: {
        id: true,
        baseDist: true,
        baseRisk: true,
        toll: true,
        a: { select: { id: true, name: true } },
        b: { select: { id: true, name: true } }
      }
    });

    if (!road) {
      return NextResponse.json({ 
        error: 'No direct route found between these hubs' 
      }, { status: 404 });
    }

    // For now, we'll mock the guild ownership data since it's not in the current schema
    // In a full implementation, you'd have guild ownership of links/roads
    const mockRoadOwnership = {
      [fromHubId]: 'Crown Guild',
      [toHubId]: 'Merchant Alliance'
    };

    // Calculate base travel costs
    const baseToll = road.toll;
    const baseDistance = road.baseDist;
    const riskFactor = road.baseRisk;
    
    // Base costs calculation
    const distanceCost = Math.ceil(baseDistance * 0.1); // 0.1 gold per distance unit
    const tollCost = baseToll;
    const riskSurcharge = Math.ceil((cargoValue || 0) * riskFactor * 0.01); // Risk-based insurance

    let totalToll = tollCost;
    let allianceDiscount = 0;
    let allianceInfo: any = null;

    // Check for alliance benefits if user is in a guild
    if (membership && membership.guildId) {
      // In a full implementation, you'd query which guild owns this road
      // For now, we'll simulate alliance checking with mock data
      
      // Check if the road owner guild is allied with user's guild
      const roadOwnerGuildId = 'mock-road-owner-id'; // This would be from database
      
      if (roadOwnerGuildId && roadOwnerGuildId !== membership.guildId) {
        const allianceStatus = await checkAllianceStatus(membership.guildId, roadOwnerGuildId);
        
        if (allianceStatus.isAllied) {
          allianceDiscount = Math.ceil(tollCost * (allianceStatus.travelTaxReduction / 100));
          totalToll = tollCost - allianceDiscount;
          
          allianceInfo = {
            isAllied: true,
            reductionPercent: allianceStatus.travelTaxReduction,
            discountAmount: allianceDiscount,
            originalToll: tollCost,
            discountedToll: totalToll
          };
        }
      }
    }

    const totalCost = distanceCost + totalToll + riskSurcharge;

    // Calculate estimated travel time (mock calculation)
    const baseTimeHours = Math.ceil(baseDistance / 10); // 10 distance units per hour
    const riskDelayHours = Math.ceil(riskFactor * 2); // Risk adds delay
    const totalTimeHours = baseTimeHours + riskDelayHours;

    return NextResponse.json({
      success: true,
      route: {
        from: fromHub,
        to: toHub,
        distance: baseDistance,
        riskLevel: riskFactor,
        estimatedTime: {
          hours: totalTimeHours,
          formatted: `${totalTimeHours}h`
        }
      },
      costs: {
        distanceCost,
        tollCost: totalToll,
        originalToll: tollCost,
        riskSurcharge,
        totalCost,
        breakdown: {
          distance: distanceCost,
          toll: totalToll,
          insurance: riskSurcharge
        }
      },
      alliance: allianceInfo,
      userGuild: membership ? {
        id: membership.guild.id,
        name: membership.guild.name,
        tag: membership.guild.tag
      } : null,
      warnings: riskFactor > 0.5 ? [
        'High risk route - consider additional escort',
        'Insurance costs are elevated due to danger'
      ] : [],
      recommendations: allianceInfo?.isAllied ? [
        `Alliance discount applied: ${allianceInfo.reductionPercent}% off travel taxes`,
        `You saved ${allianceDiscount} gold through your alliance`
      ] : [
        'Consider forming alliances for travel tax benefits',
        'Allied guilds receive significant discounts on road taxes'
      ]
    });

  } catch (error) {
    console.error('Error calculating travel costs:', error);
    return NextResponse.json(
      { error: 'Failed to calculate travel costs' },
      { status: 500 }
    );
  }
}