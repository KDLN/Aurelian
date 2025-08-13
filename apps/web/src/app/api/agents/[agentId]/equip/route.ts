import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, EquipmentSlot } from '@prisma/client';
import { calculateAgentStats } from '@/lib/agents/generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const prisma = new PrismaClient();

// POST /api/agents/[agentId]/equip - Equip item to agent
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
    const { itemKey, slot } = await request.json();

    if (!itemKey || !slot) {
      return NextResponse.json({ error: 'Item key and slot are required' }, { status: 400 });
    }

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

    // Get equipment definition
    const equipmentDef = await prisma.equipmentDef.findUnique({
      where: { itemKey }
    });

    if (!equipmentDef) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Verify slot matches
    if (equipmentDef.slot !== slot) {
      return NextResponse.json({ error: 'Item cannot be equipped in this slot' }, { status: 400 });
    }

    // Check level requirement
    if (agent.level < equipmentDef.minLevel) {
      return NextResponse.json({ 
        error: `Agent level ${agent.level} too low. Requires level ${equipmentDef.minLevel}` 
      }, { status: 400 });
    }

    // Check agent type requirement
    if (equipmentDef.agentType && equipmentDef.agentType !== agent.specialty) {
      return NextResponse.json({ 
        error: `This equipment is only for ${equipmentDef.agentType} agents` 
      }, { status: 400 });
    }

    // Check if user has the item in inventory
    const inventoryItem = await prisma.inventory.findFirst({
      where: {
        userId: user.id,
        itemKey,
        location: 'warehouse',
        quantity: { gte: 1 }
      }
    });

    if (!inventoryItem) {
      return NextResponse.json({ error: 'Item not in inventory' }, { status: 400 });
    }

    // Update agent equipment and recalculate stats
    const result = await prisma.$transaction(async (tx) => {
      // Remove item from inventory
      await tx.inventory.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: {
            decrement: 1
          }
        }
      });

      // Get current equipment in this slot to return to inventory
      const currentEquipment = agent[slot.toLowerCase() as keyof typeof agent] as string | null;
      
      if (currentEquipment) {
        // Return current equipment to inventory
        await tx.inventory.upsert({
          where: {
            userId_itemKey_location: {
              userId: user.id,
              itemKey: currentEquipment,
              location: 'warehouse'
            }
          },
          update: {
            quantity: { increment: 1 }
          },
          create: {
            userId: user.id,
            itemId: (await tx.itemDef.findFirst({ where: { itemKey: currentEquipment } }))!.id,
            itemKey: currentEquipment,
            location: 'warehouse',
            quantity: 1,
            rarity: 'COMMON'
          }
        });
      }

      // Equip new item
      const updateData: any = {};
      updateData[slot.toLowerCase()] = itemKey;

      // Recalculate agent stats
      const baseStats = calculateAgentStats(agent.specialty, agent.level);
      
      // Get all equipment bonuses
      const allEquipment = {
        weapon: slot === EquipmentSlot.WEAPON ? itemKey : agent.weapon,
        armor: slot === EquipmentSlot.ARMOR ? itemKey : agent.armor,
        tool: slot === EquipmentSlot.TOOL ? itemKey : agent.tool,
        accessory: slot === EquipmentSlot.ACCESSORY ? itemKey : agent.accessory,
      };

      let totalEquipmentBonuses = { successBonus: 0, speedBonus: 0, rewardBonus: 0 };
      
      for (const [slotName, equippedItemKey] of Object.entries(allEquipment)) {
        if (equippedItemKey) {
          const equipment = await tx.equipmentDef.findUnique({
            where: { itemKey: equippedItemKey }
          });
          if (equipment) {
            totalEquipmentBonuses.successBonus += equipment.successBonus;
            totalEquipmentBonuses.speedBonus += equipment.speedBonus;
            totalEquipmentBonuses.rewardBonus += equipment.rewardBonus;
          }
        }
      }

      // Update agent with new equipment and stats
      updateData.successBonus = baseStats.successBonus + totalEquipmentBonuses.successBonus;
      updateData.speedBonus = baseStats.speedBonus + totalEquipmentBonuses.speedBonus;
      updateData.rewardBonus = baseStats.rewardBonus + totalEquipmentBonuses.rewardBonus;

      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: updateData
      });

      return updatedAgent;
    });

    return NextResponse.json({ 
      agent: result,
      message: `Equipped ${equipmentDef.name} to ${agent.name}`
    });

  } catch (error) {
    console.error('Error equipping item:', error);
    return NextResponse.json({ error: 'Failed to equip item' }, { status: 500 });
  }
}