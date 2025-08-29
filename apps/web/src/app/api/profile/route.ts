import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, withAuth } from '@/lib/api/server-utils';
import type { ProfileResponse, AuthUser } from '@/types/api';

export const dynamic = 'force-dynamic';

// GET - Get user profile
export const GET = withAuth(async (request: NextRequest, user: AuthUser): Promise<NextResponse<ProfileResponse>> => {
  // Get user profile
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      display: true,
      avatar: true,
      createdAt: true
    }
  });

  // Return default profile if none exists
  const profileData = profile || {
    id: '',
    display: 'Trader',
    avatar: null,
    createdAt: new Date().toISOString()
  };

  return apiSuccess({ profile: profileData });
});