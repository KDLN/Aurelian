import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { key, name, rarity, stack, meta } = body;

    const item = await prisma.itemDef.update({
      where: { id: params.id },
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
    console.error('Admin items PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.itemDef.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin items DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}