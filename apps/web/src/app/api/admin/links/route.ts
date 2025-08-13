import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const links = await prisma.link.findMany({
      include: {
        a: {
          select: {
            name: true,
          },
        },
        b: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { a: { name: 'asc' } },
        { b: { name: 'asc' } },
      ],
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Admin links GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const link = await prisma.link.create({
      data: body,
      include: {
        a: {
          select: {
            name: true,
          },
        },
        b: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error('Admin links POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    );
  }
}