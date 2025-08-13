import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const hub = await prisma.hub.update({
      where: { id: params.id },
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
    console.error('Admin hubs PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update hub' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.hub.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin hubs DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete hub' },
      { status: 500 }
    );
  }
}