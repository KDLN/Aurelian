import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const blueprints = await prisma.blueprint.findMany({
      include: {
        output: {
          select: {
            name: true,
            key: true,
          },
        },
      },
      orderBy: { key: 'asc' },
    });

    return NextResponse.json(blueprints);
  } catch (error) {
    console.error('Admin blueprints GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blueprints' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const blueprint = await prisma.blueprint.create({
      data: body,
      include: {
        output: {
          select: {
            name: true,
            key: true,
          },
        },
      },
    });

    return NextResponse.json(blueprint);
  } catch (error) {
    console.error('Admin blueprints POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create blueprint' },
      { status: 500 }
    );
  }
}