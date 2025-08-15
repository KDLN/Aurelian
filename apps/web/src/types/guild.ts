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

// Guild Alliance/Rivalry (Enhanced)
export interface GuildAlliance {
  id: string;
  type: 'ALLIANCE' | 'RIVALRY';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  isProposer: boolean;
  otherGuild: {
    id: string;
    name: string;
    tag: string;
    level: number;
    treasury: number;
    memberCount: number;
  };
  proposedAt: string;
  acceptedAt?: string;
  expiresAt?: string;
  brokenAt?: string;
  brokenReason?: string;
  terms?: AllianceTerms;
  proposalMessage?: string;
  benefits?: AllianceBenefits;
  channels?: AllianceChannelInfo[];
  activeMissions?: AllianceMissionInfo[];
}

// Alliance Terms and Conditions
export interface AllianceTerms {
  travelTaxReduction: number;
  auctionFeeReduction: number;
  safePassage: boolean;
  sharedChat: boolean;
  jointMissions: boolean;
}

// Alliance Benefits (runtime calculated)
export interface AllianceBenefits {
  travelTaxReduction: number;
  auctionFeeReduction: number;
  safePassage: boolean;
  sharedChat: boolean;
  jointMissions: boolean;
}

// Alliance Channel Info
export interface AllianceChannelInfo {
  id: string;
  name: string;
  isActive: boolean;
}

// Alliance Mission Info
export interface AllianceMissionInfo {
  id: string;
  name: string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
}

// Alliance Statistics
export interface AllianceStats {
  totalActive: number;
  totalAlliances: number;
  totalRivalries: number;
  pendingIncoming: number;
  pendingOutgoing: number;
  totalSharedChannels: number;
  totalActiveMissions: number;
  averageTravelBenefit: number;
  averageAuctionBenefit: number;
}

// Alliance Activity
export interface AllianceActivity {
  id: string;
  action: string;
  details: any;
  createdAt: string;
  user: string;
}

// Alliance Management Data
export interface AllianceManagement {
  alliances: {
    active: GuildAlliance[];
    pending: {
      incoming: GuildAlliance[];
      outgoing: GuildAlliance[];
    };
    past: GuildAlliance[];
  };
  stats: AllianceStats;
  recentActivity: AllianceActivity[];
  userGuild: {
    id: string;
    name: string;
    tag: string;
    userRole: GuildRole;
    canManageAlliances: boolean;
    canBreakAlliances: boolean;
  };
}

// Alliance Proposal Form Data
export interface AllianceProposal {
  targetGuildId: string;
  type: 'ALLIANCE' | 'RIVALRY';
  message?: string;
  terms?: Partial<AllianceTerms>;
}

// Alliance Response Form Data
export interface AllianceResponse {
  allianceId: string;
  action: 'ACCEPT' | 'DECLINE';
  responseMessage?: string;
}

// Joint Alliance Mission
export interface AllianceMission {
  id: string;
  allianceId: string;
  name: string;
  description: string;
  requirements: any;
  rewards: any;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
  maxParticipants: number;
  currentParticipants: number;
  participants: AllianceMissionParticipant[];
  createdAt: string;
  updatedAt: string;
}

// Alliance Mission Participant
export interface AllianceMissionParticipant {
  id: string;
  userId: string;
  guildId: string;
  displayName: string;
  guildName: string;
  guildTag: string;
  contribution?: any;
  joinedAt: string;
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

export interface AllianceManagementResponse {
  success: true;
  data: AllianceManagement;
}

export interface AllianceProposalResponse {
  success: true;
  message: string;
  alliance: {
    id: string;
    type: 'ALLIANCE' | 'RIVALRY';
    status: 'PENDING';
    fromGuild: { id: string; name: string; tag: string; };
    toGuild: { id: string; name: string; tag: string; };
    proposedAt: string;
    expiresAt?: string;
    terms?: AllianceTerms;
    proposalMessage?: string;
  };
}

export interface AllianceResponseConfirmation {
  success: true;
  message: string;
  alliance: {
    id: string;
    type: 'ALLIANCE' | 'RIVALRY';
    status: 'ACCEPTED' | 'DECLINED';
    fromGuild: { id: string; name: string; tag: string; };
    toGuild: { id: string; name: string; tag: string; };
    proposedAt: string;
    acceptedAt?: string;
    terms?: AllianceTerms;
    travelTaxReduction: number;
    auctionFeeReduction: number;
  };
}

export interface AllianceBreakResponse {
  success: true;
  message: string;
  details: {
    allianceId: string;
    brokenAt: string;
    reason: string;
    otherGuild: {
      id: string;
      name: string;
      tag: string;
    };
    cleanupActions: {
      channelsDeactivated: number;
      missionsCancelled: number;
    };
  };
}

// API Error Response
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

// Standard API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

// Guild Health Report Types
export interface GuildHealthReport {
  healthScore: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  memberStats: {
    total: number;
    active: number;
    inactive: number;
    activityRate: number;
    roleDistribution: Record<GuildRole, number>;
    avgContributionPoints: number;
    topContributors: Array<{
      name: string;
      role: GuildRole;
      points: number;
    }>;
  };
  recentActivity: {
    totalActivities: number;
    dailyAverage: number;
    actionBreakdown: Record<string, number>;
    dailyActivity: Record<string, number>;
    mostActiveDay: string;
  };
  financialHealth: {
    currentTreasury: number;
    expectedTreasury: number;
    treasuryRatio: number;
    status: string;
    guildLevel: number;
    xp: number;
    xpNext: number;
    xpProgress: number;
  };
  warehouseHealth: {
    totalItems: number;
    uniqueItemTypes: number;
    diversity: number;
    itemTypes: string[];
    topItems: Array<{ name: string; quantity: number }>;
    isEmpty: boolean;
    status: string;
  };
  leadershipHealth: {
    totalLeaders: number;
    totalOfficers: number;
    activeLeaders: number;
    activeOfficers: number;
    leadershipHealth: number;
    hasActiveLeadership: boolean;
    needsMoreOfficers: boolean;
    leaderDetails: Array<{
      name: string;
      lastActive: string;
      isActive: boolean;
    }>;
  };
  recommendations: string[];
}

// Enhanced activity details
export interface ActivityDetails {
  amount?: number;
  itemId?: string;
  targetUserId?: string;
  targetUsername?: string;
  oldRole?: GuildRole;
  newRole?: GuildRole;
  reason?: string;
  [key: string]: any;
}

// Type-safe guild activity with better details
export interface TypedGuildActivity {
  id: string;
  action: 
    | 'guild_created'
    | 'member_joined'
    | 'member_left'
    | 'member_promoted'
    | 'member_demoted'
    | 'member_kicked'
    | 'invitation_sent'
    | 'invitation_declined'
    | 'treasury_deposit'
    | 'treasury_withdraw'
    | 'warehouse_deposit'
    | 'warehouse_withdraw'
    | 'war_declared'
    | 'alliance_proposed'
    | string; // Allow other actions
  details: ActivityDetails;
  createdAt: string;
  user: string;
  userId?: string;
}

// Loading and error states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Form validation
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> extends LoadingState {
  data: T;
  errors: ValidationError[];
  isDirty: boolean;
  isValid: boolean;
}