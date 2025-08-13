import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const mission = await prisma.missionDef.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(mission);
  } catch (error) {
    console.error('Admin missions PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update mission' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.missionDef.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin missions DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete mission' },
      { status: 500 }
    );
  }
}