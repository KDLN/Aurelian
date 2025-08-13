import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      itemsCount,
      equipmentCount,
      blueprintsCount,
      missionsCount,
      hubsCount,
      linksCount,
    ] = await Promise.all([
      prisma.itemDef.count(),
      prisma.equipmentDef.count(),
      prisma.blueprint.count(),
      prisma.missionDef.count(),
      prisma.hub.count(),
      prisma.link.count(),
    ]);

    return NextResponse.json({
      items: itemsCount,
      equipment: equipmentCount,
      blueprints: blueprintsCount,
      missions: missionsCount,
      hubs: hubsCount,
      links: linksCount,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}