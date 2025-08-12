import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

// Standard error responses
export const ApiErrors = {
  NO_TOKEN: { error: 'No token provided', status: 401 },
  INVALID_TOKEN: { error: 'Invalid token', status: 401 },
  NOT_IN_GUILD: { error: 'Not in a guild', status: 403 },
  INSUFFICIENT_PERMISSIONS: { error: 'Insufficient permissions', status: 403 },
  MISSING_FIELDS: { error: 'Missing required fields', status: 400 },
  INTERNAL_ERROR: { error: 'Internal server error', status: 500 },
  NOT_FOUND: { error: 'Resource not found', status: 404 },
  CONFLICT: { error: 'Resource conflict', status: 409 }
} as const;

// Create standard error response
export function createErrorResponse(error: keyof typeof ApiErrors, details?: string) {
  const errorConfig = ApiErrors[error];
  return NextResponse.json(
    { 
      error: errorConfig.error,
      ...(details && { details })
    },
    { status: errorConfig.status }
  );
}

// Create success response
export function createSuccessResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data
  });
}

// Supabase client instance
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Authenticate user and return user data
export async function authenticateUser(token: string | null) {
  if (!token) {
    return { error: 'NO_TOKEN' as const };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'INVALID_TOKEN' as const };
  }

  return { user };
}

// Get user's guild membership with role and guild info
export async function getUserGuildMembership(userId: string) {
  try {
    const membership = await prisma.guildMember.findUnique({
      where: { userId },
      include: {
        guild: {
          select: {
            id: true,
            name: true,
            tag: true,
            level: true,
            treasury: true,
            maxMembers: true,
            isActive: true
          }
        }
      }
    });

    if (!membership) {
      return { error: 'NOT_IN_GUILD' as const };
    }

    return { membership };
  } catch (error) {
    console.error('Error fetching guild membership:', error);
    return { error: 'INTERNAL_ERROR' as const };
  }
}

// Check if user has sufficient role permissions
export function checkRolePermissions(userRole: string, requiredRoles: string[]) {
  return requiredRoles.includes(userRole);
}

// Standard role hierarchy
export const ROLE_HIERARCHY = {
  LEADER: 4,
  OFFICER: 3,
  TRADER: 2,
  MEMBER: 1
} as const;

// Check if user can manage another user based on role hierarchy
export function canManageRole(managerRole: string, targetRole: string) {
  const managerLevel = ROLE_HIERARCHY[managerRole as keyof typeof ROLE_HIERARCHY] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole as keyof typeof ROLE_HIERARCHY] || 0;
  return managerLevel > targetLevel;
}

// Log guild activity
export async function logGuildActivity(
  guildId: string,
  userId: string,
  action: string,
  details?: any
) {
  try {
    await prisma.guildLog.create({
      data: {
        guildId,
        userId,
        action,
        details: details || {}
      }
    });
  } catch (error) {
    console.error('Error logging guild activity:', error);
    // Don't throw error for logging failures
  }
}

// Validate required fields in request body
export function validateRequiredFields(body: any, fields: string[]) {
  const missing = fields.filter(field => !body[field]);
  return missing.length === 0 ? null : `Missing required fields: ${missing.join(', ')}`;
}

// Common guild member formatting
export function formatGuildMember(member: any) {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    contributionPoints: member.contributionPoints,
    lastActive: member.lastActive,
    displayName: member.user?.profile?.display || member.user?.email?.split('@')[0] || 'Unknown'
  };
}

// Common guild formatting
export function formatGuildInfo(guild: any) {
  return {
    id: guild.id,
    name: guild.name,
    tag: guild.tag,
    level: guild.level,
    xp: guild.xp,
    treasury: guild.treasury,
    memberCount: guild._count?.members || 0,
    maxMembers: guild.maxMembers,
    isActive: guild.isActive,
    createdAt: guild.createdAt
  };
}