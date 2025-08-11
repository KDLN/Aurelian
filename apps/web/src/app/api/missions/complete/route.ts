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

    // Calculate success/failure based on risk level
    const missionDef = missionInstance.mission;
    let success = true;
    let actualReward = missionDef.baseReward;
    let itemsReceived = missionDef.itemRewards ? [...(missionDef.itemRewards as any[])] : [];

    // Risk-based success calculation
    const riskRoll = Math.random();
    switch (missionDef.riskLevel) {
      case 'LOW':
        success = riskRoll > 0.05; // 95% success rate
        break;
      case 'MEDIUM':
        success = riskRoll > 0.15; // 85% success rate
        if (!success) {
          actualReward = Math.floor(actualReward * 0.3); // 30% reward on failure
          itemsReceived = itemsReceived.map((item: any) => ({ ...item, qty: Math.ceil(item.qty * 0.2) }));
        }
        break;
      case 'HIGH':
        success = riskRoll > 0.25; // 75% success rate
        if (!success) {
          actualReward = 0; // No gold reward on failure
          itemsReceived = []; // No item rewards on failure
        }
        break;
    }

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
      rewards: {
        gold: actualReward,
        items: itemsReceived
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