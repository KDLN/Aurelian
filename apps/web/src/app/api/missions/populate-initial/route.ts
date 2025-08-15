import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Populate database with initial mission definitions
export async function POST(request: NextRequest) {
  try {
    // Get JWT token from headers
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token with Supabase (admin check could be added here)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if missions already exist
    const existingMissions = await prisma.missionDef.findMany({
      where: { isActive: true }
    });

    if (existingMissions.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Mission definitions already exist',
        existingCount: existingMissions.length
      });
    }

    // Define initial mission data
    const initialMissions = [
      {
        name: 'Iron Ore Run',
        description: 'Transport iron ore from the mines to the trading post. A straightforward route with minimal risk.',
        fromHub: 'Mining Camp',
        toHub: 'Capital City',
        distance: 150,
        baseDuration: 300, // 5 minutes
        baseReward: 75,
        riskLevel: 'LOW',
        itemRewards: [{ itemKey: 'iron_ore', qty: 3 }],
        isActive: true
      },
      {
        name: 'Herb Delivery',
        description: 'Deliver rare medicinal herbs to the healers guild. Moderate risk through forest paths.',
        fromHub: 'Forest Camp',
        toHub: 'Capital City',
        distance: 200,
        baseDuration: 420, // 7 minutes
        baseReward: 100,
        riskLevel: 'MEDIUM',
        itemRewards: [{ itemKey: 'herb', qty: 2 }],
        isActive: true
      },
      {
        name: 'Relic Recovery',
        description: 'Dangerous expedition to recover ancient relics from forgotten ruins. High risk, high reward.',
        fromHub: 'Capital City',
        toHub: 'Ancient Ruins',
        distance: 300,
        baseDuration: 600, // 10 minutes
        baseReward: 200,
        riskLevel: 'HIGH',
        itemRewards: [{ itemKey: 'relic_fragment', qty: 1 }],
        isActive: true
      },
      {
        name: 'Hide Procurement',
        description: 'Collect quality animal hides from frontier settlements for leather crafting.',
        fromHub: 'Frontier Post',
        toHub: 'Capital City',
        distance: 180,
        baseDuration: 360, // 6 minutes
        baseReward: 90,
        riskLevel: 'LOW',
        itemRewards: [{ itemKey: 'hide', qty: 4 }],
        isActive: true
      },
      {
        name: 'Pearl Diving Expedition',
        description: 'Oversee pearl diving operations at the coastal waters. Weather-dependent with moderate risks.',
        fromHub: 'Coastal Village',
        toHub: 'Capital City',
        distance: 220,
        baseDuration: 480, // 8 minutes
        baseReward: 150,
        riskLevel: 'MEDIUM',
        itemRewards: [{ itemKey: 'pearl', qty: 2 }],
        isActive: true
      },
      {
        name: 'Quick Courier',
        description: 'Fast delivery run between nearby settlements. Low risk, quick turnaround.',
        fromHub: 'Capital City',
        toHub: 'Trade Outpost',
        distance: 100,
        baseDuration: 180, // 3 minutes
        baseReward: 50,
        riskLevel: 'LOW',
        itemRewards: [],
        isActive: true
      }
    ];

    // Create mission definitions
    const createdMissions = await prisma.missionDef.createMany({
      data: initialMissions.map(mission => ({
        name: mission.name,
        description: mission.description,
        fromHub: mission.fromHub,
        toHub: mission.toHub,
        distance: mission.distance,
        baseDuration: mission.baseDuration,
        baseReward: mission.baseReward,
        riskLevel: mission.riskLevel as any,
        itemRewards: mission.itemRewards,
        isActive: mission.isActive
      }))
    });

    console.log(`✅ Created ${createdMissions.count} initial mission definitions`);

    return NextResponse.json({
      success: true,
      message: `Created ${createdMissions.count} initial mission definitions`,
      missions: initialMissions.map(m => ({ name: m.name, riskLevel: m.riskLevel, reward: m.baseReward }))
    });

  } catch (error) {
    console.error('Error populating initial missions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to populate initial missions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}