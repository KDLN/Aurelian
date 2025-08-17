import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { generateRandomAgent, getHiringCost } from '@/lib/agents/generator';
import { ActivityLogger } from '@/lib/services/activityLogger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const prisma = new PrismaClient();

// GET /api/agents - Get user's agents
export async function GET(request: NextRequest) {
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

    // Get user's agents with mission count
    const agents = await prisma.agent.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            missions: {
              where: {
                status: 'active'
              }
            }
          }
        }
      },
      orderBy: {
        hiredAt: 'asc'
      }
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST /api/agents - Hire a new agent
export async function POST(request: NextRequest) {
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

    const { agentType } = await request.json();
    
    if (!agentType) {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    // Check if user has enough gold
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    const hiringCost = getHiringCost(agentType);
    
    if (!wallet || wallet.gold < hiringCost) {
      return NextResponse.json({ 
        error: `Insufficient gold. Need ${hiringCost}g, have ${wallet?.gold || 0}g` 
      }, { status: 400 });
    }

    // Check agent limit (max 4 agents)
    const currentAgentCount = await prisma.agent.count({
      where: {
        userId: user.id,
        isActive: true
      }
    });

    if (currentAgentCount >= 4) {
      return NextResponse.json({ 
        error: 'Maximum of 4 agents allowed' 
      }, { status: 400 });
    }

    // Generate new agent
    const newAgentData = generateRandomAgent(agentType);

    // Create agent and deduct gold in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct gold
      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          gold: {
            decrement: hiringCost
          }
        }
      });

      // Create agent
      const agent = await tx.agent.create({
        data: {
          userId: user.id,
          ...newAgentData,
        }
      });

      return agent;
    });

    // Log the agent hiring activity
    await ActivityLogger.logAgentHired(user.id, newAgentData.name, newAgentData.class);

    return NextResponse.json({ 
      agent: result,
      message: `Hired ${newAgentData.name} for ${hiringCost}g`
    });

  } catch (error) {
    console.error('Error hiring agent:', error);
    return NextResponse.json({ error: 'Failed to hire agent' }, { status: 500 });
  }
}