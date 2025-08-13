import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const blueprint = await prisma.blueprint.update({
      where: { id: params.id },
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
    console.error('Admin blueprints PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update blueprint' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.blueprint.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin blueprints DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete blueprint' },
      { status: 500 }
    );
  }
}