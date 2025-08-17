import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthLight } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';

export const dynamic = 'force-dynamic';

// GET - Fetch user profile (refactored with middleware)
export async function GET(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    console.log('🔄 [UserProfile] GET API called for user:', user.id);
    
    try {
      // Fetch the profile
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { display: true }
      });

      console.log('✅ [UserProfile] Profile fetched:', profile);

      return createSuccessResponse({ profile });

    } catch (dbError) {
      console.error('[UserProfile] Database error:', dbError);
      return createErrorResponse('INTERNAL_ERROR', 'Failed to fetch profile');
    }
  });
}