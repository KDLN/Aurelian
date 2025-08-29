// API Type Definitions for all routes

// Standard API Response Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error Response
export interface ApiError {
  error: string;
  details?: string;
  status?: number;
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
}

// Profile API Types
export interface Profile {
  id: string;
  display: string;
  avatar: string | null;
  createdAt: string;
}

export interface ProfileResponse extends ApiResponse<{ profile: Profile }> {}

// Inventory API Types
export interface InventoryItem {
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

export interface InventoryResponse extends ApiResponse<{
  items: InventoryItem[];
  location: string;
}> {}

// Admin Items API Types
export interface ItemDef {
  id: string;
  key: string;
  name: string;
  rarity: string;
  stack: number;
  meta: any | null;
}

export interface CreateItemRequest {
  key: string;
  name: string;
  rarity: string;
  stack?: number;
  meta?: any;
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
}

export type ItemsResponse = ApiResponse<ItemDef[]>;
export type ItemResponse = ApiResponse<ItemDef>;

// Admin Equipment API Types
export interface EquipmentDef {
  id: string;
  key: string;
  name: string;
  slot: string;
  stats: any;
  meta: any | null;
}

export interface CreateEquipmentRequest {
  key: string;
  name: string;
  slot: string;
  stats: any;
  meta?: any;
}

export interface UpdateEquipmentRequest extends Partial<CreateEquipmentRequest> {
  id: string;
}

export type EquipmentResponse = ApiResponse<EquipmentDef[]>;
export type SingleEquipmentResponse = ApiResponse<EquipmentDef>;

// Admin Blueprints API Types
export interface Blueprint {
  id: string;
  key: string;
  name: string;
  inputs: any;
  outputs: any;
  duration: number;
  meta: any | null;
}

export interface CreateBlueprintRequest {
  key: string;
  name: string;
  inputs: any;
  outputs: any;
  duration: number;
  meta?: any;
}

export interface UpdateBlueprintRequest extends Partial<CreateBlueprintRequest> {
  id: string;
}

export type BlueprintsResponse = ApiResponse<Blueprint[]>;
export type BlueprintResponse = ApiResponse<Blueprint>;

// Admin Missions API Types
export interface Mission {
  id: string;
  key: string;
  name: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  eta: number;
  inputs: any;
  outputs: any;
  meta: any | null;
}

export interface CreateMissionRequest {
  key: string;
  name: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  eta: number;
  inputs: any;
  outputs: any;
  meta?: any;
}

export interface UpdateMissionRequest extends Partial<CreateMissionRequest> {
  id: string;
}

export type MissionsResponse = ApiResponse<Mission[]>;
export type MissionResponse = ApiResponse<Mission>;

// Admin Hubs API Types
export interface Hub {
  id: string;
  key: string;
  name: string;
  x: number;
  y: number;
  meta: any | null;
}

export interface CreateHubRequest {
  key: string;
  name: string;
  x: number;
  y: number;
  meta?: any;
}

export interface UpdateHubRequest extends Partial<CreateHubRequest> {
  id: string;
}

export type HubsResponse = ApiResponse<Hub[]>;
export type HubResponse = ApiResponse<Hub>;

// Admin Links API Types
export interface Link {
  id: string;
  key: string;
  fromId: string;
  toId: string;
  distance: number;
  meta: any | null;
}

export interface CreateLinkRequest {
  key: string;
  fromId: string;
  toId: string;
  distance: number;
  meta?: any;
}

export interface UpdateLinkRequest extends Partial<CreateLinkRequest> {
  id: string;
}

export type LinksResponse = ApiResponse<Link[]>;
export type LinkResponse = ApiResponse<Link>;

// User Stats API Types
export interface UserStats {
  totalGold: number;
  totalItems: number;
  completedMissions: number;
  level: number;
  xp: number;
}

export type UserStatsResponse = ApiResponse<UserStats>;

// Market API Types
export interface MarketSummary {
  totalListings: number;
  totalVolume: number;
  topItems: Array<{
    itemId: string;
    name: string;
    averagePrice: number;
    volume: number;
  }>;
}

export type MarketSummaryResponse = ApiResponse<MarketSummary>;

export interface MarketEvent {
  id: string;
  type: string;
  itemId: string;
  price: number;
  timestamp: string;
}

export type MarketEventsResponse = ApiResponse<MarketEvent[]>;

export interface PriceTick {
  id: string;
  itemId: string;
  price: number;
  timestamp: string;
}

export type PriceHistoryResponse = ApiResponse<PriceTick[]>;

export interface MarketTrend {
  itemId: string;
  itemName: string;
  currentPrice: number;
  priceChange: number;
  percentageChange: number;
  volume: number;
}

export type MarketTrendsResponse = ApiResponse<MarketTrend[]>;

// Auction API Types
export interface Listing {
  id: string;
  itemId: string;
  qty: number;
  price: number;
  sellerId: string;
  createdAt: string;
  expiresAt: string;
  item: {
    name: string;
    rarity: string;
    key: string;
  };
}

export interface CreateListingRequest {
  itemId: string;
  qty: number;
  price: number;
  duration: number;
}

export interface BuyListingRequest {
  listingId: string;
  qty: number;
}

export type ListingsResponse = ApiResponse<Listing[]>;
export type ListingResponse = ApiResponse<Listing>;

// News API Types
export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  publishedAt: string;
  isPublished: boolean;
}

export interface CreateNewsRequest {
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isPublished: boolean;
}

export interface UpdateNewsRequest extends Partial<CreateNewsRequest> {
  id: string;
}

export type NewsResponse = ApiResponse<NewsArticle[]>;
export type SingleNewsResponse = ApiResponse<NewsArticle>;

// Crafting API Types
export interface CraftJob {
  id: string;
  blueprintId: string;
  qty: number;
  startedAt: string;
  finishesAt: string;
  isComplete: boolean;
  blueprint: Blueprint;
}

export interface StartCraftingRequest {
  blueprintId: string;
  qty: number;
}

export interface CompleteCraftingRequest {
  jobId: string;
}

export type CraftJobsResponse = ApiResponse<CraftJob[]>;
export type CraftJobResponse = ApiResponse<CraftJob>;

// Travel API Types
export interface TravelCalculation {
  fromId: string;
  toId: string;
  distance: number;
  cost: number;
  duration: number;
  path: string[];
}

export interface TravelRequest {
  fromId: string;
  toId: string;
  cargoIds?: string[];
}

export interface ExecuteTravelRequest {
  fromId: string;
  toId: string;
  cargoIds: string[];
}

export type TravelCalculationResponse = ApiResponse<TravelCalculation>;
export type TravelExecuteResponse = ApiResponse<{ success: boolean; message: string }>;

// Chat API Types
export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  user: {
    displayName: string;
    avatar?: string;
  };
}

export interface SendMessageRequest {
  content: string;
  channel?: string;
}

export interface OnlineUser {
  userId: string;
  displayName: string;
  lastSeen: string;
}

export type ChatMessagesResponse = ApiResponse<ChatMessage[]>;
export type OnlineUsersResponse = ApiResponse<OnlineUser[]>;

// Contracts API Types
export interface Contract {
  id: string;
  type: 'BUY' | 'SELL';
  itemId: string;
  qty: number;
  price: number;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export type ContractsResponse = ApiResponse<Contract[]>;

// User Wallet API Types
export interface Wallet {
  id: string;
  balance: number;
  createdAt: string;
}

export interface CreateWalletRequest {
  initialBalance?: number;
}

export type WalletResponse = ApiResponse<Wallet>;

// User Avatar API Types
export interface Avatar {
  hair: string;
  clothing: string;
  accessories: string[];
}

export interface UpdateAvatarRequest extends Avatar {}

export type AvatarResponse = ApiResponse<Avatar>;

// User Onboarding API Types
export interface OnboardingData {
  step: number;
  completedSteps: string[];
  isComplete: boolean;
}

export interface UpdateOnboardingRequest {
  step?: number;
  completedSteps?: string[];
  isComplete?: boolean;
}

export type OnboardingResponse = ApiResponse<OnboardingData>;

// Feedback API Types
export interface Feedback {
  id: string;
  type: 'BUG' | 'FEATURE' | 'GENERAL';
  content: string;
  email?: string;
  createdAt: string;
}

export interface CreateFeedbackRequest {
  type: 'BUG' | 'FEATURE' | 'GENERAL';
  content: string;
  email?: string;
}

export type FeedbackResponse = ApiResponse<Feedback>;

// Next.js API Route Handler Types
export type NextApiHandler = (
  request: Request
) => Promise<Response>;

export type AuthenticatedApiHandler = (
  request: Request,
  user: AuthUser
) => Promise<Response>;