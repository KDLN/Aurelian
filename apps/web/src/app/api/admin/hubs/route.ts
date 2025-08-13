import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const hubs = await prisma.hub.findMany({
      include: {
        _count: {
          select: {
            linksA: true,
            linksB: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(hubs);
  } catch (error) {
    console.error('Admin hubs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hubs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const hub = await prisma.hub.create({
      data: body,
      include: {
        _count: {
          select: {
            linksA: true,
            linksB: true,
          },
        },
      },
    });

    return NextResponse.json(hub);
  } catch (error) {
    console.error('Admin hubs POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create hub' },
      { status: 500 }
    );
  }
}