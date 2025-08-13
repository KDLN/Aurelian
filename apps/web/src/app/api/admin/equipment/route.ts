import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const equipment = await prisma.equipmentDef.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Admin equipment GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const equipment = await prisma.equipmentDef.create({
      data: body,
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Admin equipment POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}