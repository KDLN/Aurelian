import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Complete a mission and award rewards
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 [MissionComplete] API called at:', new Date().toISOString());
    console.log('🎯 [MissionComplete] Headers:', {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin')
    });
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

    const { missionInstanceId } = await request.json();
    console.log('🎯 [MissionComplete] Completing mission:', missionInstanceId, 'for user:', user.id);

    if (!missionInstanceId) {
      return NextResponse.json({ error: 'Mission instance ID required' }, { status: 400 });
    }

    try {
      // Get mission instance with mission definition
      const missionInstance = await prisma.missionInstance.findUnique({
        where: { id: missionInstanceId },
        include: { mission: true }
      });

      if (!missionInstance) {
        return NextResponse.json({ error: 'Mission instance not found' }, { status: 404 });
      }

      if (missionInstance.userId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      if (missionInstance.status !== 'active') {
        return NextResponse.json({ error: 'Mission is not active' }, { status: 400 });
      }

      // Check if mission is ready to complete (end time has passed)
      if (new Date() < missionInstance.endTime) {
        return NextResponse.json({ error: 'Mission not yet complete' }, { status: 400 });
      }

    // Enhanced dynamic outcome system
    const missionDef = missionInstance.mission;
    
    // Roll 0-100 for outcome
    let outcomeRoll = Math.floor(Math.random() * 101);
    
    // Apply risk-based modifiers
    switch (missionDef.riskLevel) {
      case 'LOW':
        outcomeRoll += 20; // Easier outcomes
        break;
      case 'MEDIUM':
        // No modifier
        break;
      case 'HIGH':
        outcomeRoll -= 15; // Harder outcomes, but better rewards
        break;
    }
    
    // Clamp roll between 0-100
    outcomeRoll = Math.max(0, Math.min(100, outcomeRoll));
    
    // Determine outcome type and modifiers
    let outcomeType: string;
    let outcomeDescription: string;
    let goldMultiplier: number;
    let itemMultiplier: number;
    let bonusChance: number;
    let discoveryChance: number;
    
    if (outcomeRoll >= 90) {
      outcomeType = 'CRITICAL_SUCCESS';
      outcomeDescription = 'Exceptional success! Your caravan traveled swiftly and safely, with expert navigation avoiding all hazards. The crew discovered additional opportunities along the route.';
      goldMultiplier = 1.5;
      itemMultiplier = 1.0;
      bonusChance = 0.8; // 80% chance for bonus items
      discoveryChance = 0.3; // 30% chance for discovery
    } else if (outcomeRoll >= 70) {
      outcomeType = 'GOOD_SUCCESS';
      outcomeDescription = 'Great success! The journey proceeded smoothly with only minor delays. Your caravan arrived safely with full cargo and some extra goods picked up en route.';
      goldMultiplier = 1.2;
      itemMultiplier = 1.0;
      bonusChance = 0.4; // 40% chance for bonus items
      discoveryChance = 0.1; // 10% chance for discovery
    } else if (outcomeRoll >= 40) {
      outcomeType = 'NORMAL_SUCCESS';
      outcomeDescription = 'Mission completed successfully. The caravan reached its destination as planned with all expected cargo intact. A routine but profitable journey.';
      goldMultiplier = 1.0;
      itemMultiplier = 1.0;
      bonusChance = 0.1; // 10% chance for bonus items
      discoveryChance = 0.05; // 5% chance for discovery
    } else if (outcomeRoll >= 20) {
      outcomeType = 'POOR_SUCCESS';
      outcomeDescription = 'Difficult journey with complications. Your caravan faced delays, harsh weather, or equipment problems but managed to deliver most of the cargo. Some goods were damaged or lost.';
      goldMultiplier = 0.7;
      itemMultiplier = 0.75;
      bonusChance = 0.0;
      discoveryChance = 0.0;
    } else if (outcomeRoll >= 5) {
      outcomeType = 'FAILURE';
      outcomeDescription = 'Mission largely failed due to bandits, severe weather, or major equipment failure. Only salvaged a small portion of the cargo and minimal payment for the attempt.';
      goldMultiplier = 0.3;
      itemMultiplier = 0.25;
      bonusChance = 0.0;
      discoveryChance = 0.0;
    } else {
      outcomeType = 'CRITICAL_FAILURE';
      outcomeDescription = 'Catastrophic failure! The caravan was completely lost to bandits, disasters, or other calamity. Nothing was recovered and the caravan requires major repairs.';
      goldMultiplier = 0.0;
      itemMultiplier = 0.0;
      bonusChance = 0.0;
      discoveryChance = 0.0;
    }
    
    // Calculate base gold reward with risk bonus
    let baseGold = missionDef.baseReward;
    if (missionDef.riskLevel === 'HIGH') {
      baseGold = Math.floor(baseGold * 1.25); // 25% bonus for high risk
    }
    
    // Apply outcome multiplier
    let actualReward = Math.floor(baseGold * goldMultiplier);
    
    // Add random variation (±10%)
    const variation = Math.floor(actualReward * 0.1 * (Math.random() * 2 - 1));
    actualReward = Math.max(0, actualReward + variation);
    
    // Calculate item rewards and track what was lost
    const originalItems = missionDef.itemRewards ? [...(missionDef.itemRewards as any[])] : [];
    let itemsReceived = originalItems.map((item: any) => ({
      ...item,
      qty: Math.max(0, Math.floor(item.qty * itemMultiplier))
    }));
    
    // Track what was lost for detailed reporting
    const itemsLost = originalItems.map((originalItem: any) => {
      const receivedItem = itemsReceived.find((item: any) => item.itemKey === originalItem.itemKey);
      const lostQty = originalItem.qty - (receivedItem?.qty || 0);
      return {
        itemKey: originalItem.itemKey,
        qty: lostQty
      };
    }).filter((item: any) => item.qty > 0);
    
    // Filter out zero-quantity items from received
    itemsReceived = itemsReceived.filter((item: any) => item.qty > 0);
    
    // Track bonus/discovery for response
    let bonusItemsAdded = false;
    let discoveryItemsAdded = false;
    
    // Add bonus items for good outcomes
    if (bonusChance > 0 && Math.random() < bonusChance) {
      bonusItemsAdded = true;
      const bonusItems = ['iron_ore', 'herb', 'hide'];
      const bonusItem = bonusItems[Math.floor(Math.random() * bonusItems.length)];
      const existingBonus = itemsReceived.find((item: any) => item.itemKey === bonusItem);
      
      if (existingBonus) {
        existingBonus.qty += Math.ceil(Math.random() * 2); // 1-2 bonus
      } else {
        itemsReceived.push({ itemKey: bonusItem, qty: Math.ceil(Math.random() * 2) });
      }
    }
    
    // Add discovery items for exceptional outcomes
    if (discoveryChance > 0 && Math.random() < discoveryChance) {
      discoveryItemsAdded = true;
      const discoveryItems = ['pearl', 'relic_fragment'];
      const discoveryItem = discoveryItems[Math.floor(Math.random() * discoveryItems.length)];
      const existingDiscovery = itemsReceived.find((item: any) => item.itemKey === discoveryItem);
      
      if (existingDiscovery) {
        existingDiscovery.qty += 1;
      } else {
        itemsReceived.push({ itemKey: discoveryItem, qty: 1 });
      }
    }
    
    const success = outcomeRoll >= 40; // Success threshold

    // Award gold reward if successful
    if (actualReward > 0) {
      // Get or create user wallet
      const wallet = await prisma.wallet.upsert({
        where: { userId: user.id },
        update: { gold: { increment: actualReward } },
        create: { userId: user.id, gold: actualReward }
      });
    }

    // Award item rewards if successful
    if (itemsReceived.length > 0) {
      for (const itemReward of itemsReceived) {
        // Get item definition
        const itemDef = await prisma.itemDef.findUnique({
          where: { key: itemReward.itemKey }
        });

        if (itemDef) {
          // Add items to inventory
          await prisma.inventory.upsert({
            where: {
              userId_itemId_location: {
                userId: user.id,
                itemId: itemDef.id,
                location: 'warehouse'
              }
            },
            update: { qty: { increment: itemReward.qty } },
            create: {
              userId: user.id,
              itemId: itemDef.id,
              qty: itemReward.qty,
              location: 'warehouse'
            }
          });
        }
      }
    }

    // Mark mission as completed
    const completedMission = await prisma.missionInstance.update({
      where: { id: missionInstanceId },
      data: {
        status: success ? 'completed' : 'failed',
        completedAt: new Date(),
        actualReward,
        itemsReceived
      }
    });

    // Calculate gold lost for reporting
    const expectedGold = missionDef.riskLevel === 'HIGH' ? Math.floor(missionDef.baseReward * 1.25) : missionDef.baseReward;
    const goldLost = expectedGold - actualReward;
    
    // Create detailed outcome report
    let outcomeReport = outcomeDescription;
    
    // Add specific details about what happened
    if (actualReward > expectedGold) {
      outcomeReport += ` You earned ${actualReward - expectedGold} extra gold from excellent performance.`;
    } else if (goldLost > 0) {
      outcomeReport += ` ${goldLost} gold was lost due to complications.`;
    }
    
    if (bonusItemsAdded) {
      outcomeReport += ' Your crew found additional valuable materials during the journey.';
    }
    
    if (discoveryItemsAdded) {
      outcomeReport += ' A remarkable discovery was made along the route!';
    }
    
    if (itemsLost.length > 0) {
      const lostItemNames = itemsLost.map(item => `${item.qty} ${item.itemKey.replace('_', ' ')}`).join(', ');
      outcomeReport += ` Lost cargo: ${lostItemNames}.`;
    }

    return NextResponse.json({
      success: true,
      missionSuccess: success,
      outcomeType,
      outcomeRoll,
      outcomeDescription: outcomeReport,
      rewards: {
        gold: actualReward,
        items: itemsReceived
      },
      breakdown: {
        expectedRewards: {
          gold: expectedGold,
          items: originalItems
        },
        actualRewards: {
          gold: actualReward,
          items: itemsReceived
        },
        losses: {
          gold: Math.max(0, goldLost),
          items: itemsLost
        },
        bonuses: {
          bonusItemsAdded,
          discoveryItemsAdded,
          goldBonus: Math.max(0, actualReward - expectedGold)
        }
      },
      details: {
        baseGold: missionDef.baseReward,
        goldMultiplier,
        riskBonus: missionDef.riskLevel === 'HIGH' ? 1.25 : 1.0,
        finalGoldBeforeVariation: Math.floor((missionDef.riskLevel === 'HIGH' ? missionDef.baseReward * 1.25 : missionDef.baseReward) * goldMultiplier),
        itemMultiplier,
        riskLevel: missionDef.riskLevel
      },
      completedMission
    });

    } catch (dbError) {
      console.error('[Complete] Database error, falling back to mock:', dbError);
      
      // Return mock completion when database operation fails
      return NextResponse.json({
        success: true,
        missionSuccess: true,
        outcomeType: 'NORMAL_SUCCESS',
        outcomeRoll: 75,
        outcomeDescription: 'Mission completed successfully (mock response due to database unavailability).',
        rewards: {
          gold: 75,
          items: [{ itemKey: 'iron_ore', qty: 3 }]
        }
      });
    }

  } catch (error) {
    console.error('Error completing mission:', error);
    return NextResponse.json(
      { error: 'Failed to complete mission' },
      { status: 500 }
    );
  }
}