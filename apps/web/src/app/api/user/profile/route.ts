import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthLight, getRequestBody } from '@/lib/auth/middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiUtils';
import { ensureUserSynced } from '@/lib/auth/auto-sync';

export const dynamic = 'force-dynamic';

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    console.log('✅ [UserProfile] Fetching profile for user:', user.id);

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

// POST - Update user profile
export async function POST(request: NextRequest) {
  return withAuthLight(request, async (user) => {
    const body = await getRequestBody<{ userId: string; display: string }>(request);
    
    if (!body || !body.display) {
      return createErrorResponse('MISSING_FIELDS', 'Display name is required');
    }

    const { userId, display } = body;

    // Verify the user is updating their own profile
    if (userId !== user.id) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Cannot update another user\'s profile');
    }

    console.log('✅ [UserProfile] Updating profile for user:', user.id, 'display:', display);

    try {
      // Check if user exists in our database (they should exist from OAuth callback)
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true }
      });

      if (!existingUser) {
        console.log(`🔄 [UserProfile] User ${user.id} not found in database, attempting auto-sync`);
        
        try {
          // Try to sync the user from Supabase auth to our database
          console.log(`🔄 [UserProfile] Attempting sync for user ${user.id} with email: ${user.email}`);
          const syncResult = await ensureUserSynced(user);
          
          if (!syncResult) {
            console.error(`❌ [UserProfile] ensureUserSynced returned null for user ${user.id}`);
            return createErrorResponse('SYNC_FAILED', 'User sync returned null. Database may be unavailable.');
          }
          
          // Check again after sync
          const syncedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true }
          });
          
          if (!syncedUser) {
            console.error(`❌ [UserProfile] User ${user.id} still not found after sync attempt`);
            return createErrorResponse('SYNC_FAILED', 'User not found in database after sync. Database connection issue.');
          }
          
          console.log(`✅ [UserProfile] Auto-sync successful for user ${user.id}`);
        } catch (syncError: any) {
          console.error(`❌ [UserProfile] Auto-sync error for user ${user.id}:`, {
            error: syncError,
            message: syncError?.message,
            stack: syncError?.stack
          });
          return createErrorResponse('SYNC_ERROR', `Database sync error: ${syncError?.message || 'Unknown error'}`);
        }
      }

      // Get user info after potential sync
      const userInfo = existingUser || await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true }
      });

      console.log(`✅ [UserProfile] User ${user.id} exists in database with email: ${userInfo?.email}`);

      // Also check if a profile already exists
      const currentProfile = await prisma.profile.findUnique({
        where: { userId: user.id }
      });

      console.log(`🔍 [UserProfile] Existing profile check:`, {
        exists: !!currentProfile,
        currentDisplay: currentProfile?.display
      });

      // Check if display name is already taken by another user
      const duplicateProfile = await prisma.profile.findFirst({
        where: {
          display: display,
          userId: { not: user.id }
        }
      });

      if (duplicateProfile) {
        return createErrorResponse('CONFLICT', 'Username already taken');
      }

      // Note: Wallet and starter items should have been created during OAuth signup

      // Update the profile (now that user exists)
      const updatedProfile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: { display: display },
        create: { 
          userId: user.id, 
          display: display 
        }
      });

      console.log('✅ [UserProfile] Profile updated successfully');

      return createSuccessResponse({ profile: updatedProfile });

    } catch (dbError: any) {
      console.error('[UserProfile] Database error:', {
        error: dbError,
        message: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta,
        stack: dbError?.stack
      });
      
      // Handle specific database errors
      if (dbError?.code === 'P2002' || dbError?.message?.includes('23505')) {
        return createErrorResponse('CONFLICT', 'Username already taken');
      }
      
      if (dbError?.code === 'P2025') {
        return createErrorResponse('NOT_FOUND', 'User record not found');
      }
      
      // Return more detailed error for debugging
      const errorMessage = dbError?.message || 'Unknown database error';
      return createErrorResponse('INTERNAL_ERROR', `Database error: ${errorMessage}`);
    }
  });
}