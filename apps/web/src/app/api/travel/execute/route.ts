import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to check alliance benefits
async function getAllianceBenefits(userGuildId: string, roadOwnerGuildId: string) {
  if (!userGuildId || !roadOwnerGuildId || userGuildId === roadOwnerGuildId) {
    return { isAllied: false, travelTaxReduction: 0 };
  }

  const alliance = await prisma.guildAlliance.findFirst({
    where: {
      OR: [
        { fromGuildId: userGuildId, toGuildId: roadOwnerGuildId },
        { fromGuildId: roadOwnerGuildId, toGuildId: userGuildId }
      ],
      status: 'ACCEPTED',
      type: 'ALLIANCE'
    },
    select: {
      travelTaxReduction: true,
      fromGuild: { select: { name: true, tag: true } },
      toGuild: { select: { name: true, tag: true } }
    }
  });

  return {
    isAllied: !!alliance,
    travelTaxReduction: alliance?.travelTaxReduction || 0,
    alliedGuild: alliance ? (
      alliance.fromGuild ? alliance.fromGuild : alliance.toGuild
    ) : null
  };
}

// POST - Execute travel with alliance benefits
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

    const { fromHubId, toHubId, cargoItems, escortLevel } = await request.json();

    if (!fromHubId || !toHubId) {
      return NextResponse.json({ 
        error: 'From and to hub IDs are required' 
      }, { status: 400 });
    }

    // Get user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        wallets: true,
        guildMembership: {
          include: {
            guild: { select: { id: true, name: true, tag: true } }
          }
        }
      }
    });

    if (!userData || !userData.wallets) {
      return NextResponse.json({ error: 'User or wallet not found' }, { status: 404 });
    }

    // Get route information
    const road = await prisma.link.findFirst({
      where: {
        OR: [
          { aId: fromHubId, bId: toHubId },
          { aId: toHubId, bId: fromHubId }
        ]
      },
      include: {
        a: { select: { id: true, name: true, key: true } },
        b: { select: { id: true, name: true, key: true } }
      }
    });

    if (!road) {
      return NextResponse.json({ 
        error: 'No route found between these hubs' 
      }, { status: 404 });
    }

    // Calculate costs (simplified - in real implementation this would be more complex)
    const baseToll = road.toll;
    const distanceCost = Math.ceil(road.baseDist * 0.1);
    const escortCost = (escortLevel || 0) * 5; // 5 gold per escort level
    
    // Calculate cargo value for risk assessment
    const totalCargoValue = (cargoItems || []).reduce((sum: number, item: any) => {
      return sum + (item.value || 0) * (item.quantity || 1);
    }, 0);
    
    const riskSurcharge = Math.ceil(totalCargoValue * road.baseRisk * 0.01);

    let finalToll = baseToll;
    let allianceDiscount = 0;
    let allianceBenefits: any = null;

    // Apply alliance benefits if user is in a guild
    if (userData.guildMembership) {
      // In a real implementation, you'd get the actual road owner from the database
      // For now, we'll simulate with mock data
      const mockRoadOwnerGuildId = 'sample-road-owner-guild-id';
      
      const benefits = await getAllianceBenefits(
        userData.guildMembership.guildId, 
        mockRoadOwnerGuildId
      );

      if (benefits.isAllied) {
        allianceDiscount = Math.ceil(baseToll * (benefits.travelTaxReduction / 100));
        finalToll = baseToll - allianceDiscount;
        
        allianceBenefits = {
          alliedGuild: benefits.alliedGuild,
          discountPercent: benefits.travelTaxReduction,
          discountAmount: allianceDiscount,
          originalToll: baseToll,
          discountedToll: finalToll
        };
      }
    }

    const totalCost = distanceCost + finalToll + escortCost + riskSurcharge;

    // Check if user has enough gold
    if (userData.wallets.gold < totalCost) {
      return NextResponse.json({
        error: 'Insufficient gold',
        required: totalCost,
        available: userData.wallets.gold,
        shortfall: totalCost - userData.wallets.gold
      }, { status: 400 });
    }

    // Calculate travel time
    const baseTime = Math.ceil(road.baseDist / 8); // 8 distance units per hour
    const riskDelay = Math.ceil(road.baseRisk * 1.5); // Risk adds delay
    const totalHours = Math.max(1, baseTime + riskDelay - (escortLevel || 0)); // Escort reduces time

    const arrivalTime = new Date();
    arrivalTime.setHours(arrivalTime.getHours() + totalHours);

    // Execute the travel in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct travel costs
      await tx.wallet.update({
        where: { userId: user.id },
        data: { gold: userData.wallets!.gold - totalCost }
      });

      // Create route booking record (simplified)
      const booking = await tx.routeBooking.create({
        data: {
          userId: user.id,
          fromHubId: fromHubId,
          toHubId: toHubId,
          tollPaid: finalToll,
          summary: {
            cargoItems: cargoItems || [],
            escortLevel: escortLevel || 0,
            allianceBenefits,
            costBreakdown: {
              distance: distanceCost,
              toll: finalToll,
              escort: escortCost,
              insurance: riskSurcharge,
              allianceDiscount: allianceDiscount
            }
          }
        }
      });

      // Log alliance benefit usage if applicable
      if (allianceBenefits && userData.guildMembership) {
        await tx.guildLog.create({
          data: {
            guildId: userData.guildMembership.guildId,
            userId: user.id,
            action: 'alliance_travel_benefit_used',
            details: {
              route: `${road.a.name} → ${road.b.name}`,
              allianceDiscount,
              discountPercent: allianceBenefits.discountPercent,
              alliedGuild: allianceBenefits.alliedGuild,
              totalSaved: allianceDiscount,
              bookingId: booking.id
            }
          }
        });
      }

      return booking;
    });

    return NextResponse.json({
      success: true,
      message: 'Travel initiated successfully',
      booking: {
        id: result.id,
        route: {
          from: road.a,
          to: road.b,
          distance: road.baseDist,
          risk: road.baseRisk
        },
        departure: new Date(),
        arrival: arrivalTime,
        duration: {
          hours: totalHours,
          formatted: `${totalHours}h`
        },
        cost: {
          total: totalCost,
          breakdown: {
            distance: distanceCost,
            toll: finalToll,
            escort: escortCost,
            insurance: riskSurcharge
          },
          allianceDiscount: allianceDiscount
        },
        cargo: cargoItems || [],
        escortLevel: escortLevel || 0,
        status: 'traveling'
      },
      allianceBenefits,
      userWallet: {
        goldBefore: userData.wallets.gold,
        goldAfter: userData.wallets.gold - totalCost,
        goldSpent: totalCost
      },
      notifications: [
        `Travel from ${road.a.name} to ${road.b.name} initiated`,
        `Estimated arrival: ${arrivalTime.toLocaleString()}`,
        ...(allianceBenefits ? [`Alliance discount saved you ${allianceDiscount} gold!`] : [])
      ]
    });

  } catch (error) {
    console.error('Error executing travel:', error);
    return NextResponse.json(
      { error: 'Failed to execute travel' },
      { status: 500 }
    );
  }
}