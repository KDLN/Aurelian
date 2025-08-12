// Guild System Type Definitions

// Basic Guild Information
export interface Guild {
  id: string;
  name: string;
  tag: string;
  emblem?: {
    color?: string;
    symbol?: string;
  };
  description?: string;
  level: number;
  xp: number;
  xpNext: number;
  treasury: number;
  memberCount: number;
  maxMembers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Guild Member Information
export interface GuildMember {
  id: string;
  userId: string;
  role: GuildRole;
  joinedAt: string;
  contributionPoints: number;
  lastActive: string;
  displayName: string;
  permissions?: string[];
}

// Guild Role Enum
export type GuildRole = 'LEADER' | 'OFFICER' | 'TRADER' | 'MEMBER';

// Guild with User's Membership Info
export interface GuildInfo extends Guild {
  userRole: GuildRole;
  userJoinedAt: string;
  userContributionPoints: number;
  userPermissions?: string[];
  xpProgress: number;
  
  // Related Data
  recentMembers: Array<{
    role: GuildRole;
    displayName: string;
  }>;
  
  recentAchievements: GuildAchievement[];
  channels: GuildChannel[];
  recentActivity: GuildActivity[];
  roleDistribution: Record<GuildRole, number>;
}

// Guild Achievement
export interface GuildAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  unlockedAt: string;
  reward: {
    xp?: number;
    gold?: number;
    items?: Array<{ itemId: string; quantity: number }>;
  };
}

// Guild Channel
export interface GuildChannel {
  id: string;
  name: string;
  description?: string;
  roleRequired?: GuildRole;
  isActive: boolean;
  createdAt: string;
}

// Guild Activity Log
export interface GuildActivity {
  id: string;
  action: string;
  details: any;
  createdAt: string;
  user: string;
}

// Guild Invitation
export interface GuildInvitation {
  id: string;
  guild: {
    id: string;
    name: string;
    tag: string;
    level: number;
    memberCount: number;
  };
  inviter: {
    displayName: string;
  };
  message?: string;
  createdAt: string;
  expiresAt: string;
}

// Guild Alliance/Rivalry
export interface GuildAlliance {
  id: string;
  type: 'ALLIANCE' | 'RIVALRY';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  opponent: {
    id: string;
    name: string;
    tag: string;
    level: number;
    treasury: number;
    memberCount: number;
  };
  proposedAt: string;
  acceptedAt?: string;
  isProposer: boolean;
}

// Guild Warehouse Item
export interface GuildWarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    key: string;
    name: string;
    rarity: string;
    stack: number;
    meta: any;
  };
}

// User Inventory Item (for warehouse deposits/withdrawals)
export interface UserInventoryItem {
  id: string;
  itemId: string;
  qty: number;
  location: string;
  item: {
    id: string;
    key: string;
    name: string;
    rarity: string;
    stack: number;
    meta: any;
  };
}

// Guild Browse/Search Result
export interface GuildSearchResult {
  id: string;
  name: string;
  tag: string;
  description?: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  treasury: number;
  isRecruiting: boolean;
  leader: {
    displayName: string;
  };
  achievements: number;
  createdAt: string;
}

// Guild War Competition Data
export interface GuildCompetition {
  leaderboard: Array<{
    rank: number;
    guild: {
      id: string;
      name: string;
      tag: string;
      level: number;
      xp: number;
      treasury: number;
      memberCount: number;
    };
    isOwnGuild: boolean;
  }>;
  currentGuildRank: number;
  weeklyStats: {
    tradingVolume: number;
    craftingJobs: number;
  };
}

// API Response Types
export interface GuildInfoResponse {
  success: true;
  inGuild: boolean;
  guild: GuildInfo | null;
}

export interface GuildMembersResponse {
  success: true;
  guild: {
    id: string;
    name: string;
    tag: string;
  };
  members: GuildMember[];
}

export interface GuildWarehouseResponse {
  success: true;
  items: GuildWarehouseItem[];
}

export interface GuildBrowseResponse {
  success: true;
  guilds: GuildSearchResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

export interface GuildWarsResponse {
  success: true;
  wars: {
    rivalries: GuildAlliance[];
    canDeclareWar: boolean;
  };
  competitions: GuildCompetition;
}

// API Error Response
export interface ApiErrorResponse {
  error: string;
  details?: string;
}