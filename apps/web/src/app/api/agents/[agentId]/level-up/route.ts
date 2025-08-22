import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { calculateAgentStats, getExperienceForLevel } from '@/lib/agents/generator';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/agents/[agentId]/level-up - Level up agent
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { agentId } = params;

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: user.id,
        isActive: true
      }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if agent has enough experience to level up
    const xpNeededForNextLevel = getExperienceForLevel(agent.level + 1);
    if (agent.experience < xpNeededForNextLevel) {
      return NextResponse.json({ 
        error: `Not enough experience. Need ${xpNeededForNextLevel}, have ${agent.experience}` 
      }, { status: 400 });
    }

    // Calculate new stats after leveling up
    const newLevel = agent.level + 1;
    const newStats = calculateAgentStats(agent.specialty, newLevel);

    // Get current equipment bonuses to preserve them
    const allEquipment = {
      weapon: agent.weapon,
      armor: agent.armor, 
      tool: agent.tool,
      accessory: agent.accessory,
    };

    let equipmentBonuses = { successBonus: 0, speedBonus: 0, rewardBonus: 0 };
    
    for (const [slotName, equippedItemKey] of Object.entries(allEquipment)) {
      if (equippedItemKey) {
        const equipment = await prisma.equipmentDef.findUnique({
          where: { itemKey: equippedItemKey }
        });
        if (equipment) {
          equipmentBonuses.successBonus += equipment.successBonus;
          equipmentBonuses.speedBonus += equipment.speedBonus;
          equipmentBonuses.rewardBonus += equipment.rewardBonus;
        }
      }
    }

    // Update agent with new level and stats
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        level: newLevel,
        successBonus: newStats.successBonus + equipmentBonuses.successBonus,
        speedBonus: newStats.speedBonus + equipmentBonuses.speedBonus,
        rewardBonus: newStats.rewardBonus + equipmentBonuses.rewardBonus,
      }
    });

    return NextResponse.json({ 
      agent: updatedAgent,
      message: `${agent.name} leveled up to level ${newLevel}!`,
      newStats: {
        base: newStats,
        equipment: equipmentBonuses,
        total: {
          successBonus: newStats.successBonus + equipmentBonuses.successBonus,
          speedBonus: newStats.speedBonus + equipmentBonuses.speedBonus,
          rewardBonus: newStats.rewardBonus + equipmentBonuses.rewardBonus,
        }
      }
    });

  } catch (error) {
    console.error('Error leveling up agent:', error);
    return NextResponse.json({ error: 'Failed to level up agent' }, { status: 500 });
  }
}