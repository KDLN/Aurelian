import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const missions = await prisma.missionDef.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(missions);
  } catch (error) {
    console.error('Admin missions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch missions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mission = await prisma.missionDef.create({
      data: body,
    });

    return NextResponse.json(mission);
  } catch (error) {
    console.error('Admin missions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create mission' },
      { status: 500 }
    );
  }
}