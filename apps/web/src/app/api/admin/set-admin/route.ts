import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This is a one-time utility to set a user as admin
// For security, this should be removed after initial setup
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Only allow specific email to become admin for initial setup
    const allowedInitialAdmins = ['kdln@live.com'];
    if (!allowedInitialAdmins.includes(email)) {
      return NextResponse.json({ error: 'Not authorized to become admin' }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
      select: { id: true, email: true, isAdmin: true }
    });

    return NextResponse.json({
      success: true,
      message: 'User set as admin successfully',
      user
    });

  } catch (error) {
    console.error('Set admin error:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'User with that email not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to set admin status' }, { status: 500 });
  }
}