import { z } from 'zod';

// Admin Items Schemas
export const CreateItemSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50, 'Key too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']),
  stack: z.number().int().min(1).max(999).optional().default(1),
  meta: z.any().optional(),
});

export const UpdateItemSchema = CreateItemSchema.partial();

// Admin Equipment Schemas
export const CreateEquipmentSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50, 'Key too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slot: z.enum(['HEAD', 'CHEST', 'LEGS', 'FEET', 'WEAPON', 'SHIELD']),
  stats: z.record(z.number()),
  meta: z.any().optional(),
});

export const UpdateEquipmentSchema = CreateEquipmentSchema.partial();

// Admin Blueprints Schemas
export const CreateBlueprintSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50, 'Key too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  inputs: z.record(z.number()),
  outputs: z.record(z.number()),
  duration: z.number().int().min(1, 'Duration must be at least 1 second'),
  meta: z.any().optional(),
});

export const UpdateBlueprintSchema = CreateBlueprintSchema.partial();

// Admin Missions Schemas
export const CreateMissionSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50, 'Key too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  eta: z.number().int().min(1, 'ETA must be at least 1 second'),
  inputs: z.record(z.number()),
  outputs: z.record(z.number()),
  meta: z.any().optional(),
});

export const UpdateMissionSchema = CreateMissionSchema.partial();

// Admin Hubs Schemas
export const CreateHubSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50, 'Key too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  x: z.number(),
  y: z.number(),
  meta: z.any().optional(),
});

export const UpdateHubSchema = CreateHubSchema.partial();

// Admin Links Schemas
export const CreateLinkSchema = z.object({
  key: z.string().min(1, 'Key is required').max(50, 'Key too long'),
  fromId: z.string().uuid('Invalid hub ID'),
  toId: z.string().uuid('Invalid hub ID'),
  distance: z.number().min(0, 'Distance cannot be negative'),
  meta: z.any().optional(),
});

export const UpdateLinkSchema = CreateLinkSchema.partial();

// Auction Schemas
export const CreateListingSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  duration: z.number().int().min(1, 'Duration must be at least 1 hour').max(168, 'Duration cannot exceed 7 days'),
});

export const BuyListingSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
});

// News Schemas
export const CreateNewsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  isPublished: z.boolean(),
});

export const UpdateNewsSchema = CreateNewsSchema.partial();

// Crafting Schemas
export const StartCraftingSchema = z.object({
  blueprintId: z.string().uuid('Invalid blueprint ID'),
  qty: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Cannot craft more than 100 at once'),
});

export const CompleteCraftingSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
});

// Travel Schemas
export const TravelCalculateSchema = z.object({
  fromId: z.string().uuid('Invalid from hub ID'),
  toId: z.string().uuid('Invalid to hub ID'),
  cargoIds: z.array(z.string().uuid()).optional().default([]),
});

export const ExecuteTravelSchema = z.object({
  fromId: z.string().uuid('Invalid from hub ID'),
  toId: z.string().uuid('Invalid to hub ID'),
  cargoIds: z.array(z.string().uuid()).default([]),
});

// Chat Schemas
export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  channel: z.string().optional(),
});

// Wallet Schemas
export const CreateWalletSchema = z.object({
  initialBalance: z.number().min(0, 'Balance cannot be negative').optional().default(0),
});

// Avatar Schemas
export const UpdateAvatarSchema = z.object({
  hair: z.string().min(1, 'Hair style is required'),
  clothing: z.string().min(1, 'Clothing is required'),
  accessories: z.array(z.string()).default([]),
});

// Onboarding Schemas
export const UpdateOnboardingSchema = z.object({
  step: z.number().int().min(0).optional(),
  completedSteps: z.array(z.string()).optional(),
  isComplete: z.boolean().optional(),
});

// Feedback Schemas
export const CreateFeedbackSchema = z.object({
  type: z.enum(['BUG', 'FEATURE', 'GENERAL']),
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  email: z.string().email('Invalid email format').optional(),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const LocationSchema = z.object({
  location: z.enum(['warehouse', 'caravan', 'escrow']).default('warehouse'),
});

export const FilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});