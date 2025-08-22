import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser,
  createErrorResponse,
  createSuccessResponse,
  getUserGuildMembership,
  checkRolePermissions,
  logGuildActivity
} from '@/lib/apiUtils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Purge inactive members (Leader only)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    if (!user.id) {
      return createErrorResponse('INVALID_TOKEN', 'User ID missing');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership } = membershipResult;

    // Only guild leaders can purge inactive members
    if (!checkRolePermissions(membership.role, ['LEADER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only guild leaders can purge inactive members');
    }

    const body = await request.json();
    const { daysInactive = 60, dryRun = false } = body;

    // Validate days inactive
    if (typeof daysInactive !== 'number' || daysInactive < 30 || daysInactive > 365) {
      return createErrorResponse('MISSING_FIELDS', 'Days inactive must be between 30 and 365');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    // Find inactive members (excluding leaders and officers)
    const inactiveMembers = await prisma.guildMember.findMany({
      where: {
        guildId: membership.guild.id,
        lastActive: { lt: cutoffDate },
        role: { in: ['MEMBER', 'TRADER'] } // Don't purge officers or leaders
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        lastActive: 'asc'
      }
    });

    if (dryRun) {
      // Just return what would be purged
      return createSuccessResponse({
        dryRun: true,
        inactiveMembers: inactiveMembers.map(member => ({
          id: member.id,
          displayName: member.user.profile?.display || 'Unknown',
          role: member.role,
          lastActive: member.lastActive,
          daysSinceActive: Math.floor((Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24)),
          contributionPoints: member.contributionPoints
        })),
        wouldPurgeCount: inactiveMembers.length
      }, `Would purge ${inactiveMembers.length} inactive members`);
    }

    // Actually purge the members
    const purgeResults = await prisma.$transaction(async (tx) => {
      const purgedMembers: any[] = [];

      for (const member of inactiveMembers) {
        // Log the purge action
        await logGuildActivity(
          membership.guild.id,
          user.id,
          'member_purged_inactive',
          {
            purgedMemberId: member.userId,
            purgedMemberName: member.user.profile?.display || 'Unknown',
            lastActive: member.lastActive,
            daysSinceActive: Math.floor((Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24)),
            role: member.role,
            contributionPoints: member.contributionPoints,
            purgedBy: user.id
          },
          tx
        );

        // Remove the member
        await tx.guildMember.delete({
          where: { id: member.id }
        });

        purgedMembers.push({
          id: member.id,
          displayName: member.user.profile?.display || 'Unknown',
          role: member.role,
          lastActive: member.lastActive,
          daysSinceActive: Math.floor((Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24))
        });
      }

      return purgedMembers;
    }, {
      isolationLevel: 'Serializable',
      timeout: 30000
    });

    return createSuccessResponse({
      purgedMembers: purgeResults,
      purgedCount: purgeResults.length
    }, `Successfully purged ${purgeResults.length} inactive members`);

  } catch (error) {
    console.error('Error purging inactive members:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to purge inactive members');
  }
}

// GET - Get inactive members report
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
    
    // Authenticate user
    const authResult = await authenticateUser(token);
    if ('error' in authResult) {
      return createErrorResponse(authResult.error as string);
    }
    const { user } = authResult;

    if (!user.id) {
      return createErrorResponse('INVALID_TOKEN', 'User ID missing');
    }

    // Get user's guild membership
    const membershipResult = await getUserGuildMembership(user.id);
    if ('error' in membershipResult) {
      return createErrorResponse(membershipResult.error as string);
    }
    const { membership } = membershipResult;

    // Only officers and leaders can view inactive member reports
    if (!checkRolePermissions(membership.role, ['LEADER', 'OFFICER'])) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Only officers and leaders can view inactive member reports');
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    if (days < 7 || days > 365) {
      return createErrorResponse('MISSING_FIELDS', 'Days parameter must be between 7 and 365');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all guild members with activity analysis
    const members = await prisma.guildMember.findMany({
      where: {
        guildId: membership.guild.id
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        lastActive: 'asc'
      }
    });

    const memberAnalysis = members.map(member => {
      const daysSinceActive = Math.floor((Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24));
      const isInactive = member.lastActive < cutoffDate;
      
      return {
        id: member.id,
        userId: member.userId,
        displayName: member.user.profile?.display || 'Unknown',
        role: member.role,
        joinedAt: member.joinedAt,
        lastActive: member.lastActive,
        daysSinceActive,
        isInactive,
        contributionPoints: member.contributionPoints,
        canBePurged: isInactive && ['MEMBER', 'TRADER'].includes(member.role)
      };
    });

    const inactiveMembers = memberAnalysis.filter(m => m.isInactive);
    const purgableMembers = memberAnalysis.filter(m => m.canBePurged);

    return createSuccessResponse({
      totalMembers: members.length,
      inactiveCount: inactiveMembers.length,
      purgableCount: purgableMembers.length,
      cutoffDate,
      daysChecked: days,
      members: memberAnalysis,
      summary: {
        activeMembers: members.length - inactiveMembers.length,
        inactiveMembers: inactiveMembers.length,
        inactiveLeaders: inactiveMembers.filter(m => m.role === 'LEADER').length,
        inactiveOfficers: inactiveMembers.filter(m => m.role === 'OFFICER').length,
        inactiveTraders: inactiveMembers.filter(m => m.role === 'TRADER').length,
        inactiveBasicMembers: inactiveMembers.filter(m => m.role === 'MEMBER').length
      }
    });

  } catch (error) {
    console.error('Error getting inactive members report:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to get inactive members report');
  }
}