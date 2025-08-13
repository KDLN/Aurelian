import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.itemDef.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Admin items GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, name, rarity, stack, meta } = body;

    const item = await prisma.itemDef.create({
      data: {
        key,
        name,
        rarity,
        stack: stack || 1,
        meta: meta || undefined,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Admin items POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}