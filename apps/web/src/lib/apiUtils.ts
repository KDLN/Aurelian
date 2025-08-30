import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

// Standard error responses
export const ApiErrors = {
  NO_TOKEN: { error: 'No token provided', status: 401 },
  INVALID_TOKEN: { error: 'Invalid token', status: 401 },
  NOT_IN_GUILD: { error: 'Not in a guild', status: 403 },
  INSUFFICIENT_PERMISSIONS: { error: 'Insufficient permissions', status: 403 },
  ADMIN_REQUIRED: { error: 'Admin access required', status: 403 },
  MISSING_FIELDS: { error: 'Missing required fields', status: 400 },
  INTERNAL_ERROR: { error: 'Internal server error', status: 500 },
  NOT_FOUND: { error: 'Resource not found', status: 404 },
  CONFLICT: { error: 'Resource conflict', status: 409 },
  SYNC_FAILED: { error: 'Database sync failed', status: 500 },
  SYNC_ERROR: { error: 'Database sync error', status: 500 }
} as const;

// Create standard error response
export function createErrorResponse(error: keyof typeof ApiErrors | string, details?: string) {
  const errorConfig = ApiErrors[error as keyof typeof ApiErrors];
  
  if (!errorConfig) {
    // Fallback for unknown error keys
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: details || `Unknown error: ${error}`
      },
      { status: 500 }
    );
  }
  
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

// Check if user is admin by looking up in database
export async function checkUserIsAdmin(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    return user?.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Authenticate user and check admin status
export async function authenticateUserAndCheckAdmin(token: string | null) {
  const authResult = await authenticateUser(token);
  if ('error' in authResult) {
    return authResult;
  }

  const { user } = authResult;
  const isAdmin = await checkUserIsAdmin(user.id);
  
  if (!isAdmin) {
    return { error: 'ADMIN_REQUIRED' as const };
  }

  return { user, isAdmin: true };
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

// Log guild activity (can be used within transactions)
export async function logGuildActivity(
  guildId: string,
  userId: string,
  action: string,
  details?: any,
  tx?: any // Transaction object
) {
  try {
    const client = tx || prisma;
    await client.guildLog.create({
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

// Enhanced input validation
export const InputValidation = {
  // Guild name validation
  guildName: (name: string) => {
    if (!name || typeof name !== 'string') return 'Guild name is required';
    if (name.length < 3) return 'Guild name must be at least 3 characters';
    if (name.length > 30) return 'Guild name must be less than 30 characters';
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return 'Guild name contains invalid characters';
    return null;
  },

  // Guild tag validation
  guildTag: (tag: string) => {
    if (!tag || typeof tag !== 'string') return 'Guild tag is required';
    if (tag.length < 3) return 'Guild tag must be at least 3 characters';
    if (tag.length > 5) return 'Guild tag must be less than 5 characters';
    if (!/^[A-Z0-9]+$/.test(tag.toUpperCase())) return 'Guild tag can only contain letters and numbers';
    return null;
  },

  // Amount validation for gold/items
  amount: (amount: any, min = 1, max = 1000000) => {
    if (amount === undefined || amount === null) return 'Amount is required';
    if (typeof amount !== 'number' || isNaN(amount)) return 'Amount must be a number';
    if (!Number.isInteger(amount)) return 'Amount must be a whole number';
    if (amount < min) return `Amount must be at least ${min}`;
    if (amount > max) return `Amount cannot exceed ${max.toLocaleString()}`;
    return null;
  },

  // Item ID validation
  itemId: (itemId: string) => {
    if (!itemId || typeof itemId !== 'string') return 'Item ID is required';
    if (!/^[a-zA-Z0-9\-_]+$/.test(itemId)) return 'Invalid item ID format';
    return null;
  },

  // Message content validation
  messageContent: (content: string) => {
    if (!content || typeof content !== 'string') return 'Message content is required';
    if (content.trim().length === 0) return 'Message cannot be empty';
    if (content.length > 2000) return 'Message cannot exceed 2000 characters';
    return null;
  },

  // Role validation
  guildRole: (role: string) => {
    const validRoles = ['LEADER', 'OFFICER', 'TRADER', 'MEMBER'];
    if (!role || !validRoles.includes(role.toUpperCase())) {
      return `Invalid role. Must be one of: ${validRoles.join(', ')}`;
    }
    return null;
  }
};

// Rate limiting using in-memory store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 10
): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true };
}

// Clean up expired rate limit entries.
// Avoid running this interval during tests to prevent open handles
// that keep Jest from exiting.
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
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

// Safe treasury operations with race condition protection
export async function transferGold(
  fromType: 'user' | 'guild',
  toType: 'user' | 'guild', 
  fromId: string,
  toId: string,
  amount: number,
  reason?: string,
  userId?: string
) {
  return await prisma.$transaction(async (tx) => {
    if (fromType === 'user' && toType === 'guild') {
      // User to Guild (deposit)
      const userWallet = await tx.wallet.findUnique({
        where: { id: fromId },
        select: { gold: true, userId: true }
      });

      if (!userWallet || userWallet.gold < amount) {
        throw new Error('Insufficient user gold');
      }

      // Atomic operations
      await tx.wallet.update({
        where: { 
          id: fromId,
          gold: { gte: amount }
        },
        data: { gold: { decrement: amount } }
      });

      await tx.guild.update({
        where: { id: toId },
        data: { treasury: { increment: amount } }
      });

      // Log activity
      if (userId) {
        await logGuildActivity(toId, userId, 'treasury_deposit', { amount, reason }, tx);
      }

    } else if (fromType === 'guild' && toType === 'user') {
      // Guild to User (withdrawal)
      const guild = await tx.guild.findUnique({
        where: { id: fromId },
        select: { treasury: true }
      });

      if (!guild || guild.treasury < amount) {
        throw new Error('Insufficient guild treasury');
      }

      // Atomic operations
      await tx.guild.update({
        where: { 
          id: fromId,
          treasury: { gte: amount }
        },
        data: { treasury: { decrement: amount } }
      });

      await tx.wallet.update({
        where: { id: toId },
        data: { gold: { increment: amount } }
      });

      // Log activity
      if (userId) {
        await logGuildActivity(fromId, userId, 'treasury_withdraw', { amount, reason }, tx);
      }
    } else {
      throw new Error('Unsupported transfer type');
    }

    return { success: true };
  }, {
    isolationLevel: 'Serializable',
    timeout: 10000
  });
}