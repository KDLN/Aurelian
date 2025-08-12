import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const isActive = searchParams.get('active');
    const itemId = searchParams.get('itemId');
    const hubId = searchParams.get('hubId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const whereClause: any = {};
    
    if (isActive !== null) {
      whereClause.isActive = isActive === 'true';
      
      if (isActive === 'true') {
        // For active events, also check if they haven't expired
        whereClause.OR = [
          { endsAt: null },
          { endsAt: { gte: new Date() } }
        ];
      }
    }
    
    if (itemId) {
      whereClause.itemId = itemId;
    }
    
    if (hubId) {
      whereClause.hubId = hubId;
    }
    
    if (type) {
      whereClause.type = type;
    }

    // Fetch market events
    const events = await prisma.marketEvent.findMany({
      where: whereClause,
      include: {
        item: {
          select: {
            id: true,
            key: true,
            name: true,
            rarity: true
          }
        },
        hub: {
          select: {
            id: true,
            key: true,
            name: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: limit
    });

    // Process events and calculate their current status
    const processedEvents = events.map(event => {
      const now = new Date();
      const isCurrentlyActive = event.isActive && 
        (event.endsAt === null || event.endsAt > now);
      
      const timeRemaining = event.endsAt ? 
        Math.max(0, event.endsAt.getTime() - now.getTime()) : null;
      
      const duration = event.endsAt ? 
        event.endsAt.getTime() - event.startedAt.getTime() : null;

      return {
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
        priceMultiplier: event.priceMultiplier,
        isActive: isCurrentlyActive,
        startedAt: event.startedAt.toISOString(),
        endsAt: event.endsAt?.toISOString() || null,
        timeRemaining: timeRemaining ? Math.ceil(timeRemaining / 1000 / 60) : null, // minutes
        duration: duration ? Math.ceil(duration / 1000 / 60) : null, // minutes
        item: event.item ? {
          id: event.item.id,
          key: event.item.key,
          name: event.item.name,
          rarity: event.item.rarity
        } : null,
        hub: event.hub ? {
          id: event.hub.id,
          key: event.hub.key,
          name: event.hub.name
        } : null,
        scope: event.item ? 'item' : event.hub ? 'hub' : 'global'
      };
    });

    // Group events by type for summary
    const eventSummary = processedEvents.reduce((summary, event) => {
      const type = event.type;
      if (!summary[type]) {
        summary[type] = {
          total: 0,
          active: 0,
          expired: 0,
          avgMultiplier: 0,
          multipliers: []
        };
      }
      
      summary[type].total++;
      summary[type].multipliers.push(event.priceMultiplier);
      
      if (event.isActive) {
        summary[type].active++;
      } else {
        summary[type].expired++;
      }
      
      return summary;
    }, {} as Record<string, any>);

    // Calculate average multipliers
    Object.keys(eventSummary).forEach(type => {
      const multipliers = eventSummary[type].multipliers;
      eventSummary[type].avgMultiplier = 
        multipliers.reduce((sum: number, mult: number) => sum + mult, 0) / multipliers.length;
      delete eventSummary[type].multipliers; // Clean up
    });

    // Market impact analysis
    const activeEvents = processedEvents.filter(e => e.isActive);
    const marketImpact = {
      totalActiveEvents: activeEvents.length,
      affectedItems: new Set(activeEvents.filter(e => e.item).map(e => e.item!.id)).size,
      affectedHubs: new Set(activeEvents.filter(e => e.hub).map(e => e.hub!.id)).size,
      globalEvents: activeEvents.filter(e => e.scope === 'global').length,
      priceIncreasing: activeEvents.filter(e => e.priceMultiplier > 1).length,
      priceDecreasing: activeEvents.filter(e => e.priceMultiplier < 1).length,
      strongEvents: activeEvents.filter(e => Math.abs(e.priceMultiplier - 1) > 0.2).length
    };

    return NextResponse.json({
      events: processedEvents,
      summary: eventSummary,
      marketImpact,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market events API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch market events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to create new market events (for admin/automated systems)
// Input validation helper
function validateMarketEventInput(body: any): { isValid: boolean; error?: string } {
  const { type, itemId, hubId, severity, description, priceMultiplier, duration } = body;

  // Required field validation
  if (!type || typeof type !== 'string') {
    return { isValid: false, error: 'Event type is required and must be a string' };
  }

  // Type validation
  if (!['shortage', 'surplus', 'discovery', 'disruption'].includes(type)) {
    return { isValid: false, error: 'Invalid event type. Must be: shortage, surplus, discovery, or disruption' };
  }

  // Severity validation
  if (severity && !['low', 'medium', 'high'].includes(severity)) {
    return { isValid: false, error: 'Invalid severity. Must be: low, medium, or high' };
  }

  // Price multiplier validation
  if (priceMultiplier !== undefined) {
    if (typeof priceMultiplier !== 'number' || priceMultiplier <= 0 || priceMultiplier > 10) {
      return { isValid: false, error: 'Price multiplier must be a number between 0 and 10' };
    }
  }

  // Duration validation (if provided)
  if (duration !== undefined) {
    if (typeof duration !== 'number' || duration <= 0 || duration > 10080) { // Max 1 week
      return { isValid: false, error: 'Duration must be a positive number in minutes, max 10080 (1 week)' };
    }
  }

  // Description length validation
  if (description && (typeof description !== 'string' || description.length > 500)) {
    return { isValid: false, error: 'Description must be a string with max 500 characters' };
  }

  // ItemId validation (if provided)
  if (itemId && typeof itemId !== 'string') {
    return { isValid: false, error: 'ItemId must be a string' };
  }

  // HubId validation (if provided)  
  if (hubId && typeof hubId !== 'string') {
    return { isValid: false, error: 'HubId must be a string' };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateMarketEventInput(body);
    if (!validation.isValid) {
      return NextResponse.json({
        error: validation.error
      }, { status: 400 });
    }

    const {
      type,
      itemId,
      hubId,
      severity = 'medium',
      description,
      priceMultiplier = 1.0,
      duration // in minutes
    } = body;

    // Calculate end time if duration provided
    const endsAt = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

    // Create the market event
    const event = await prisma.marketEvent.create({
      data: {
        type,
        itemId: itemId || null,
        hubId: hubId || null,
        severity,
        description: description || `${type.charAt(0).toUpperCase() + type.slice(1)} event`,
        priceMultiplier,
        endsAt,
        isActive: true
      },
      include: {
        item: {
          select: {
            key: true,
            name: true
          }
        },
        hub: {
          select: {
            key: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
        priceMultiplier: event.priceMultiplier,
        startedAt: event.startedAt.toISOString(),
        endsAt: event.endsAt?.toISOString() || null,
        item: event.item,
        hub: event.hub,
        scope: event.item ? 'item' : event.hub ? 'hub' : 'global'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create market event error:', error);
    return NextResponse.json({
      error: 'Failed to create market event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}