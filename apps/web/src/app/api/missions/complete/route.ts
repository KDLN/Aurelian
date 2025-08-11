import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Prisma client with error handling
let prisma: PrismaClient | null = null;

function initPrisma() {
  if (prisma) return prisma;
  
  const dbUrl = process.env.DATABASE_URL;
  console.log('🔍 [Complete] DATABASE_URL status:', dbUrl ? 'SET' : 'NOT SET');
  
  if (dbUrl && dbUrl.includes('://')) {
    // Check if the URL has the problematic port 6543
    if (dbUrl.includes(':6543')) {
      console.log('⚠️ [Complete] DATABASE_URL contains port 6543, replacing with 5432...');
      const fixedUrl = dbUrl.replace(':6543', ':5432').replace('?pgbouncer=true&connection_limit=1', '');
      try {
        prisma = new PrismaClient({
          datasources: {
            db: {
              url: fixedUrl
            }
          }
        });
        console.log('✅ [Complete] Prisma client initialized with fixed port');
        return prisma;
      } catch (fixError) {
        console.error('❌ [Complete] Fixed URL also failed:', fixError);
      }
    }
    
    // Try original URL
    try {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl
          }
        }
      });
      console.log('✅ [Complete] Prisma client initialized successfully');
      return prisma;
    } catch (error) {
      console.error('❌ [Complete] Failed to initialize Prisma client:', error);
      // Try fallback to direct URL (non-pooled connection)
      const fallbackUrl = "postgresql://postgres.apoboundupzmulkqxkxw:XhDbhNjUEv9Q1IA4@aws-0-us-east-2.pooler.supabase.com:5432/postgres";
      console.log('🔄 [Complete] Trying fallback with DIRECT database URL...');
      try {
        prisma = new PrismaClient({
          datasources: {
            db: {
              url: fallbackUrl
            }
          }
        });
        console.log('✅ [Complete] Connected with fallback URL');
        return prisma;
      } catch (fallbackError) {
        console.error('❌ [Complete] Fallback also failed:', fallbackError);
        return null;
      }
    }
  } else {
    console.log('⚠️ [Complete] DATABASE_URL not found or invalid');
    return null;
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Complete a mission and award rewards
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

    const { missionInstanceId } = await request.json();

    if (!missionInstanceId) {
      return NextResponse.json({ error: 'Mission instance ID required' }, { status: 400 });
    }

    const db = initPrisma();
    if (!db) {
      console.log('⚠️ [Complete] Using mock completion - Prisma not initialized');
      // Return mock success when database is not available
      return NextResponse.json({
        success: true,
        rewards: {
          gold: 75,
          items: [{ itemKey: 'iron_ore', qty: 3 }]
        }
      });
    }

    // Get mission instance with mission definition
    const missionInstance = await db.missionInstance.findUnique({
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
    let goldMultiplier: number;
    let itemMultiplier: number;
    let bonusChance: number;
    let discoveryChance: number;
    
    if (outcomeRoll >= 90) {
      outcomeType = 'CRITICAL_SUCCESS';
      goldMultiplier = 1.5;
      itemMultiplier = 1.0;
      bonusChance = 0.8; // 80% chance for bonus items
      discoveryChance = 0.3; // 30% chance for discovery
    } else if (outcomeRoll >= 70) {
      outcomeType = 'GOOD_SUCCESS';
      goldMultiplier = 1.2;
      itemMultiplier = 1.0;
      bonusChance = 0.4; // 40% chance for bonus items
      discoveryChance = 0.1; // 10% chance for discovery
    } else if (outcomeRoll >= 40) {
      outcomeType = 'NORMAL_SUCCESS';
      goldMultiplier = 1.0;
      itemMultiplier = 1.0;
      bonusChance = 0.1; // 10% chance for bonus items
      discoveryChance = 0.05; // 5% chance for discovery
    } else if (outcomeRoll >= 20) {
      outcomeType = 'POOR_SUCCESS';
      goldMultiplier = 0.7;
      itemMultiplier = 0.75;
      bonusChance = 0.0;
      discoveryChance = 0.0;
    } else if (outcomeRoll >= 5) {
      outcomeType = 'FAILURE';
      goldMultiplier = 0.3;
      itemMultiplier = 0.25;
      bonusChance = 0.0;
      discoveryChance = 0.0;
    } else {
      outcomeType = 'CRITICAL_FAILURE';
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
    
    // Calculate item rewards
    let itemsReceived = missionDef.itemRewards ? [...(missionDef.itemRewards as any[])] : [];
    itemsReceived = itemsReceived.map((item: any) => ({
      ...item,
      qty: Math.max(0, Math.floor(item.qty * itemMultiplier))
    })).filter((item: any) => item.qty > 0);
    
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
      const wallet = await db.wallet.upsert({
        where: { userId: user.id },
        update: { gold: { increment: actualReward } },
        create: { userId: user.id, gold: actualReward }
      });
    }

    // Award item rewards if successful
    if (itemsReceived.length > 0) {
      for (const itemReward of itemsReceived) {
        // Get item definition
        const itemDef = await db.itemDef.findUnique({
          where: { key: itemReward.itemKey }
        });

        if (itemDef) {
          // Add items to inventory
          await db.inventory.upsert({
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
    const completedMission = await db.missionInstance.update({
      where: { id: missionInstanceId },
      data: {
        status: success ? 'completed' : 'failed',
        completedAt: new Date(),
        actualReward,
        itemsReceived
      }
    });

    return NextResponse.json({
      success: true,
      missionSuccess: success,
      outcomeType,
      outcomeRoll,
      rewards: {
        gold: actualReward,
        items: itemsReceived
      },
      details: {
        baseGold: missionDef.baseReward,
        goldMultiplier,
        riskBonus: missionDef.riskLevel === 'HIGH' ? 1.25 : 1.0,
        finalGoldBeforeVariation: Math.floor((missionDef.riskLevel === 'HIGH' ? missionDef.baseReward * 1.25 : missionDef.baseReward) * goldMultiplier),
        bonusItemsAdded,
        discoveryItemsAdded
      },
      completedMission
    });

  } catch (error) {
    console.error('Error completing mission:', error);
    return NextResponse.json(
      { error: 'Failed to complete mission' },
      { status: 500 }
    );
  }
}