-- CreateEnum
CREATE TYPE "public"."ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('active', 'sold', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('queued', 'running', 'complete', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "public"."MissionRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled', 'breached');

-- CreateEnum
CREATE TYPE "public"."AgentType" AS ENUM ('SCOUT', 'TRADER', 'GUARD', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "public"."EquipmentSlot" AS ENUM ('WEAPON', 'ARMOR', 'TOOL', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "public"."GuildRole" AS ENUM ('LEADER', 'OFFICER', 'TRADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."GuildRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."AllianceType" AS ENUM ('ALLIANCE', 'RIVALRY', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "public"."AllianceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ChannelType" AS ENUM ('GENERAL', 'TRADE', 'GUILD', 'ALLIANCE', 'DIRECT');

-- CreateEnum
CREATE TYPE "public"."MailStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."MailPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caravan_slots_unlocked" INTEGER NOT NULL DEFAULT 3,
    "caravan_slots_premium" INTEGER NOT NULL DEFAULT 0,
    "crafting_level" INTEGER NOT NULL DEFAULT 1,
    "crafting_xp" INTEGER NOT NULL DEFAULT 0,
    "crafting_xp_next" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "display" TEXT NOT NULL DEFAULT ('Trader'::text || (gen_random_uuid())::text),
    "avatar" JSONB,
    "onboarding_progress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "status" "public"."MailStatus" NOT NULL DEFAULT 'UNREAD',
    "priority" "public"."MailPriority" NOT NULL DEFAULT 'NORMAL',
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "parent_mail_id" UUID,
    "attachments" JSONB,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MailFolder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "mail_count" INTEGER NOT NULL DEFAULT 0,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MailBlock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyStats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "goldEarned" INTEGER NOT NULL DEFAULT 0,
    "goldSpent" INTEGER NOT NULL DEFAULT 0,
    "missionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "missionsFailed" INTEGER NOT NULL DEFAULT 0,
    "itemsTraded" INTEGER NOT NULL DEFAULT 0,
    "itemsCrafted" INTEGER NOT NULL DEFAULT 0,
    "agentsHired" INTEGER NOT NULL DEFAULT 0,
    "activeTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameNews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Character" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemDef" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "public"."ItemRarity" NOT NULL DEFAULT 'COMMON',
    "stack" INTEGER NOT NULL DEFAULT 9999,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "characterId" UUID,
    "userId" UUID,
    "itemId" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT 'warehouse',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blueprint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "outputId" UUID NOT NULL,
    "inputs" JSONB NOT NULL,
    "output_qty" INTEGER NOT NULL DEFAULT 1,
    "timeMin" INTEGER NOT NULL DEFAULT 10,
    "category" TEXT NOT NULL DEFAULT 'general',
    "required_level" INTEGER NOT NULL DEFAULT 1,
    "xp_reward" INTEGER NOT NULL DEFAULT 10,
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "starter_recipe" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CraftJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "blueprintId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'queued',
    "quality" TEXT NOT NULL DEFAULT 'common',
    "started_at" TIMESTAMP(3),
    "eta" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CraftJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlueprintUnlock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "blueprintId" UUID NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlocked_by" TEXT,

    CONSTRAINT "BlueprintUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "risk" "public"."MissionRisk" NOT NULL DEFAULT 'MEDIUM',
    "eta" TIMESTAMP(3) NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Listing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sellerId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "public"."ListingStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LedgerTx" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceTick" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemId" UUID NOT NULL,
    "hubId" UUID,
    "price" INTEGER NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "high" INTEGER,
    "low" INTEGER,
    "supplyDemandRatio" DOUBLE PRECISION,
    "priceMultiplier" DOUBLE PRECISION,
    "trend" TEXT,
    "volatility" DOUBLE PRECISION,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "itemId" UUID,
    "hubId" UUID,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hub" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "safe" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Link" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "aId" UUID NOT NULL,
    "bId" UUID NOT NULL,
    "baseDist" INTEGER NOT NULL,
    "baseRisk" DOUBLE PRECISION NOT NULL,
    "toll" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailNode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailSeg" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "aId" UUID NOT NULL,
    "bId" UUID NOT NULL,
    "risk" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailSeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RouteBooking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "fromHubId" UUID,
    "toHubId" UUID,
    "summary" JSONB NOT NULL,
    "tollPaid" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Guild" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "emblem" JSONB,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "xp_next" INTEGER NOT NULL DEFAULT 1000,
    "treasury" INTEGER NOT NULL DEFAULT 0,
    "max_members" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "public"."GuildRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contribution_points" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildWarehouse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildInvite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "invited_by" UUID NOT NULL,
    "message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT,
    "status" "public"."GuildRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildAchievement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reward" JSONB,

    CONSTRAINT "GuildAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guildId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role_required" "public"."GuildRole",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuildAlliance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_guild_id" UUID NOT NULL,
    "to_guild_id" UUID NOT NULL,
    "type" "public"."AllianceType" NOT NULL DEFAULT 'NEUTRAL',
    "status" "public"."AllianceStatus" NOT NULL DEFAULT 'PENDING',
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "travel_tax_reduction" INTEGER NOT NULL DEFAULT 35,
    "auction_fee_reduction" INTEGER NOT NULL DEFAULT 12,
    "terms" JSONB,
    "proposal_message" TEXT,
    "broken_at" TIMESTAMP(3),
    "broken_by" UUID,
    "broken_reason" TEXT,

    CONSTRAINT "GuildAlliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AllianceChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allianceId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'alliance-general',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllianceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AllianceMission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allianceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "max_participants" INTEGER NOT NULL DEFAULT 10,
    "current_participants" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllianceMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AllianceMissionParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "missionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "guildId" UUID NOT NULL,
    "contribution" JSONB,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllianceMissionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MissionDef" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fromHub" TEXT NOT NULL DEFAULT 'Home',
    "toHub" TEXT NOT NULL,
    "distance" INTEGER NOT NULL DEFAULT 100,
    "baseDuration" INTEGER NOT NULL DEFAULT 300,
    "baseReward" INTEGER NOT NULL DEFAULT 50,
    "riskLevel" "public"."MissionRisk" NOT NULL DEFAULT 'LOW',
    "itemRewards" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MissionInstance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL,
    "actualReward" INTEGER,
    "itemsReceived" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "caravan_slot" INTEGER NOT NULL DEFAULT 1,
    "agent_id" UUID,

    CONSTRAINT "MissionInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Agent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "specialty" "public"."AgentType" NOT NULL DEFAULT 'SCOUT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weapon" TEXT,
    "armor" TEXT,
    "tool" TEXT,
    "accessory" TEXT,
    "successBonus" INTEGER NOT NULL DEFAULT 0,
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "rewardBonus" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EquipmentDef" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itemKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slot" "public"."EquipmentSlot" NOT NULL,
    "rarity" "public"."ItemRarity" NOT NULL DEFAULT 'COMMON',
    "successBonus" INTEGER NOT NULL DEFAULT 0,
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "rewardBonus" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "agentType" "public"."AgentType",
    "crafting_level" INTEGER,
    "materials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "channelType" "public"."ChannelType" NOT NULL,
    "guildChannelId" UUID,
    "allianceChannelId" UUID,
    "parent_message_id" UUID,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatReaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMention" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_display_key" ON "public"."Profile"("display");

-- CreateIndex
CREATE INDEX "Mail_recipient_id_status_idx" ON "public"."Mail"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "Mail_sender_id_idx" ON "public"."Mail"("sender_id");

-- CreateIndex
CREATE INDEX "Mail_createdAt_idx" ON "public"."Mail"("createdAt");

-- CreateIndex
CREATE INDEX "Mail_parent_mail_id_idx" ON "public"."Mail"("parent_mail_id");

-- CreateIndex
CREATE INDEX "MailFolder_userId_idx" ON "public"."MailFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailFolder_userId_name_key" ON "public"."MailFolder"("userId", "name");

-- CreateIndex
CREATE INDEX "MailBlock_blocker_id_idx" ON "public"."MailBlock"("blocker_id");

-- CreateIndex
CREATE INDEX "MailBlock_blocked_id_idx" ON "public"."MailBlock"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "MailBlock_blocker_id_blocked_id_key" ON "public"."MailBlock"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "public"."ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_type_idx" ON "public"."ActivityLog"("type");

-- CreateIndex
CREATE INDEX "DailyStats_date_idx" ON "public"."DailyStats"("date");

-- CreateIndex
CREATE INDEX "DailyStats_userId_date_idx" ON "public"."DailyStats"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_userId_date_key" ON "public"."DailyStats"("userId", "date");

-- CreateIndex
CREATE INDEX "GameNews_isActive_publishedAt_idx" ON "public"."GameNews"("isActive", "publishedAt");

-- CreateIndex
CREATE INDEX "GameNews_category_idx" ON "public"."GameNews"("category");

-- CreateIndex
CREATE INDEX "GameNews_priority_idx" ON "public"."GameNews"("priority");

-- CreateIndex
CREATE INDEX "GameNews_isPinned_idx" ON "public"."GameNews"("isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDef_key_key" ON "public"."ItemDef"("key");

-- CreateIndex
CREATE INDEX "Inventory_userId_idx" ON "public"."Inventory"("userId");

-- CreateIndex
CREATE INDEX "Inventory_characterId_idx" ON "public"."Inventory"("characterId");

-- CreateIndex
CREATE INDEX "Inventory_itemId_idx" ON "public"."Inventory"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_userId_itemId_location_key" ON "public"."Inventory"("userId", "itemId", "location");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_key_key" ON "public"."Blueprint"("key");

-- CreateIndex
CREATE INDEX "CraftJob_userId_idx" ON "public"."CraftJob"("userId");

-- CreateIndex
CREATE INDEX "CraftJob_status_idx" ON "public"."CraftJob"("status");

-- CreateIndex
CREATE INDEX "CraftJob_eta_idx" ON "public"."CraftJob"("eta");

-- CreateIndex
CREATE INDEX "BlueprintUnlock_userId_idx" ON "public"."BlueprintUnlock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintUnlock_userId_blueprintId_key" ON "public"."BlueprintUnlock"("userId", "blueprintId");

-- CreateIndex
CREATE INDEX "Mission_userId_idx" ON "public"."Mission"("userId");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "public"."Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_eta_idx" ON "public"."Mission"("eta");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "public"."Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_itemId_idx" ON "public"."Listing"("itemId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "public"."Listing"("status");

-- CreateIndex
CREATE INDEX "LedgerTx_userId_createdAt_idx" ON "public"."LedgerTx"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceTick_itemId_at_idx" ON "public"."PriceTick"("itemId", "at");

-- CreateIndex
CREATE INDEX "PriceTick_hubId_at_idx" ON "public"."PriceTick"("hubId", "at");

-- CreateIndex
CREATE INDEX "PriceTick_itemId_hubId_at_idx" ON "public"."PriceTick"("itemId", "hubId", "at");

-- CreateIndex
CREATE INDEX "MarketEvent_isActive_startedAt_idx" ON "public"."MarketEvent"("isActive", "startedAt");

-- CreateIndex
CREATE INDEX "MarketEvent_itemId_isActive_idx" ON "public"."MarketEvent"("itemId", "isActive");

-- CreateIndex
CREATE INDEX "MarketEvent_hubId_isActive_idx" ON "public"."MarketEvent"("hubId", "isActive");

-- CreateIndex
CREATE INDEX "Contract_ownerId_idx" ON "public"."Contract"("ownerId");

-- CreateIndex
CREATE INDEX "Contract_itemId_idx" ON "public"."Contract"("itemId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "public"."Contract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Hub_key_key" ON "public"."Hub"("key");

-- CreateIndex
CREATE INDEX "Link_aId_idx" ON "public"."Link"("aId");

-- CreateIndex
CREATE INDEX "Link_bId_idx" ON "public"."Link"("bId");

-- CreateIndex
CREATE INDEX "TrailNode_userId_idx" ON "public"."TrailNode"("userId");

-- CreateIndex
CREATE INDEX "TrailSeg_userId_idx" ON "public"."TrailSeg"("userId");

-- CreateIndex
CREATE INDEX "RouteBooking_userId_createdAt_idx" ON "public"."RouteBooking"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "public"."Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_tag_key" ON "public"."Guild"("tag");

-- CreateIndex
CREATE INDEX "Guild_name_idx" ON "public"."Guild"("name");

-- CreateIndex
CREATE INDEX "Guild_tag_idx" ON "public"."Guild"("tag");

-- CreateIndex
CREATE INDEX "Guild_level_idx" ON "public"."Guild"("level");

-- CreateIndex
CREATE INDEX "Guild_is_active_idx" ON "public"."Guild"("is_active");

-- CreateIndex
CREATE INDEX "Guild_treasury_idx" ON "public"."Guild"("treasury");

-- CreateIndex
CREATE INDEX "Guild_createdAt_idx" ON "public"."Guild"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_userId_key" ON "public"."GuildMember"("userId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_role_idx" ON "public"."GuildMember"("guildId", "role");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_userId_idx" ON "public"."GuildMember"("guildId", "userId");

-- CreateIndex
CREATE INDEX "GuildMember_role_idx" ON "public"."GuildMember"("role");

-- CreateIndex
CREATE INDEX "GuildMember_last_active_idx" ON "public"."GuildMember"("last_active");

-- CreateIndex
CREATE INDEX "GuildMember_contribution_points_idx" ON "public"."GuildMember"("contribution_points");

-- CreateIndex
CREATE INDEX "GuildWarehouse_guildId_idx" ON "public"."GuildWarehouse"("guildId");

-- CreateIndex
CREATE INDEX "GuildWarehouse_itemId_idx" ON "public"."GuildWarehouse"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildWarehouse_guildId_itemId_key" ON "public"."GuildWarehouse"("guildId", "itemId");

-- CreateIndex
CREATE INDEX "GuildLog_guildId_createdAt_idx" ON "public"."GuildLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildLog_userId_idx" ON "public"."GuildLog"("userId");

-- CreateIndex
CREATE INDEX "GuildInvite_userId_idx" ON "public"."GuildInvite"("userId");

-- CreateIndex
CREATE INDEX "GuildInvite_expires_at_idx" ON "public"."GuildInvite"("expires_at");

-- CreateIndex
CREATE INDEX "GuildInvite_guildId_idx" ON "public"."GuildInvite"("guildId");

-- CreateIndex
CREATE INDEX "GuildInvite_invited_by_idx" ON "public"."GuildInvite"("invited_by");

-- CreateIndex
CREATE INDEX "GuildInvite_createdAt_idx" ON "public"."GuildInvite"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildInvite_guildId_userId_key" ON "public"."GuildInvite"("guildId", "userId");

-- CreateIndex
CREATE INDEX "GuildRequest_userId_idx" ON "public"."GuildRequest"("userId");

-- CreateIndex
CREATE INDEX "GuildRequest_guildId_idx" ON "public"."GuildRequest"("guildId");

-- CreateIndex
CREATE INDEX "GuildRequest_status_idx" ON "public"."GuildRequest"("status");

-- CreateIndex
CREATE INDEX "GuildRequest_expires_at_idx" ON "public"."GuildRequest"("expires_at");

-- CreateIndex
CREATE INDEX "GuildRequest_createdAt_idx" ON "public"."GuildRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRequest_guildId_userId_key" ON "public"."GuildRequest"("guildId", "userId");

-- CreateIndex
CREATE INDEX "GuildAchievement_guildId_idx" ON "public"."GuildAchievement"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildAchievement_guildId_key_key" ON "public"."GuildAchievement"("guildId", "key");

-- CreateIndex
CREATE INDEX "GuildChannel_guildId_idx" ON "public"."GuildChannel"("guildId");

-- CreateIndex
CREATE INDEX "GuildChannel_is_active_idx" ON "public"."GuildChannel"("is_active");

-- CreateIndex
CREATE INDEX "GuildChannel_role_required_idx" ON "public"."GuildChannel"("role_required");

-- CreateIndex
CREATE UNIQUE INDEX "GuildChannel_guildId_name_key" ON "public"."GuildChannel"("guildId", "name");

-- CreateIndex
CREATE INDEX "GuildAlliance_status_idx" ON "public"."GuildAlliance"("status");

-- CreateIndex
CREATE INDEX "GuildAlliance_from_guild_id_idx" ON "public"."GuildAlliance"("from_guild_id");

-- CreateIndex
CREATE INDEX "GuildAlliance_to_guild_id_idx" ON "public"."GuildAlliance"("to_guild_id");

-- CreateIndex
CREATE INDEX "GuildAlliance_type_idx" ON "public"."GuildAlliance"("type");

-- CreateIndex
CREATE INDEX "GuildAlliance_expires_at_idx" ON "public"."GuildAlliance"("expires_at");

-- CreateIndex
CREATE INDEX "GuildAlliance_accepted_at_idx" ON "public"."GuildAlliance"("accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "GuildAlliance_from_guild_id_to_guild_id_key" ON "public"."GuildAlliance"("from_guild_id", "to_guild_id");

-- CreateIndex
CREATE INDEX "AllianceChannel_allianceId_idx" ON "public"."AllianceChannel"("allianceId");

-- CreateIndex
CREATE INDEX "AllianceChannel_is_active_idx" ON "public"."AllianceChannel"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceChannel_allianceId_name_key" ON "public"."AllianceChannel"("allianceId", "name");

-- CreateIndex
CREATE INDEX "AllianceMission_allianceId_idx" ON "public"."AllianceMission"("allianceId");

-- CreateIndex
CREATE INDEX "AllianceMission_status_idx" ON "public"."AllianceMission"("status");

-- CreateIndex
CREATE INDEX "AllianceMission_expires_at_idx" ON "public"."AllianceMission"("expires_at");

-- CreateIndex
CREATE INDEX "AllianceMissionParticipant_missionId_idx" ON "public"."AllianceMissionParticipant"("missionId");

-- CreateIndex
CREATE INDEX "AllianceMissionParticipant_userId_idx" ON "public"."AllianceMissionParticipant"("userId");

-- CreateIndex
CREATE INDEX "AllianceMissionParticipant_guildId_idx" ON "public"."AllianceMissionParticipant"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceMissionParticipant_missionId_userId_key" ON "public"."AllianceMissionParticipant"("missionId", "userId");

-- CreateIndex
CREATE INDEX "MissionInstance_userId_status_idx" ON "public"."MissionInstance"("userId", "status");

-- CreateIndex
CREATE INDEX "MissionInstance_endTime_idx" ON "public"."MissionInstance"("endTime");

-- CreateIndex
CREATE INDEX "MissionInstance_userId_caravan_slot_status_idx" ON "public"."MissionInstance"("userId", "caravan_slot", "status");

-- CreateIndex
CREATE INDEX "MissionInstance_agent_id_idx" ON "public"."MissionInstance"("agent_id");

-- CreateIndex
CREATE INDEX "Agent_userId_isActive_idx" ON "public"."Agent"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Agent_specialty_idx" ON "public"."Agent"("specialty");

-- CreateIndex
CREATE INDEX "Agent_level_idx" ON "public"."Agent"("level");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentDef_itemKey_key" ON "public"."EquipmentDef"("itemKey");

-- CreateIndex
CREATE INDEX "EquipmentDef_slot_idx" ON "public"."EquipmentDef"("slot");

-- CreateIndex
CREATE INDEX "EquipmentDef_rarity_idx" ON "public"."EquipmentDef"("rarity");

-- CreateIndex
CREATE INDEX "EquipmentDef_agentType_idx" ON "public"."EquipmentDef"("agentType");

-- CreateIndex
CREATE INDEX "ChatMessage_channelType_createdAt_idx" ON "public"."ChatMessage"("channelType", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_guildChannelId_createdAt_idx" ON "public"."ChatMessage"("guildChannelId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_allianceChannelId_createdAt_idx" ON "public"."ChatMessage"("allianceChannelId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "public"."ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "public"."ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatReaction_message_id_idx" ON "public"."ChatReaction"("message_id");

-- CreateIndex
CREATE INDEX "ChatReaction_userId_idx" ON "public"."ChatReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReaction_message_id_userId_emoji_key" ON "public"."ChatReaction"("message_id", "userId", "emoji");

-- CreateIndex
CREATE INDEX "ChatMention_message_id_idx" ON "public"."ChatMention"("message_id");

-- CreateIndex
CREATE INDEX "ChatMention_userId_idx" ON "public"."ChatMention"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMention_message_id_userId_type_key" ON "public"."ChatMention"("message_id", "userId", "type");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mail" ADD CONSTRAINT "Mail_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mail" ADD CONSTRAINT "Mail_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mail" ADD CONSTRAINT "Mail_parent_mail_id_fkey" FOREIGN KEY ("parent_mail_id") REFERENCES "public"."Mail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MailFolder" ADD CONSTRAINT "MailFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MailBlock" ADD CONSTRAINT "MailBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MailBlock" ADD CONSTRAINT "MailBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyStats" ADD CONSTRAINT "DailyStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameNews" ADD CONSTRAINT "GameNews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blueprint" ADD CONSTRAINT "Blueprint_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CraftJob" ADD CONSTRAINT "CraftJob_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "public"."Blueprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CraftJob" ADD CONSTRAINT "CraftJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlueprintUnlock" ADD CONSTRAINT "BlueprintUnlock_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "public"."Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlueprintUnlock" ADD CONSTRAINT "BlueprintUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LedgerTx" ADD CONSTRAINT "LedgerTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceTick" ADD CONSTRAINT "PriceTick_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "public"."Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceTick" ADD CONSTRAINT "PriceTick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketEvent" ADD CONSTRAINT "MarketEvent_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "public"."Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketEvent" ADD CONSTRAINT "MarketEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_aId_fkey" FOREIGN KEY ("aId") REFERENCES "public"."Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_bId_fkey" FOREIGN KEY ("bId") REFERENCES "public"."Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailNode" ADD CONSTRAINT "TrailNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailSeg" ADD CONSTRAINT "TrailSeg_aId_fkey" FOREIGN KEY ("aId") REFERENCES "public"."TrailNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailSeg" ADD CONSTRAINT "TrailSeg_bId_fkey" FOREIGN KEY ("bId") REFERENCES "public"."TrailNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailSeg" ADD CONSTRAINT "TrailSeg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouteBooking" ADD CONSTRAINT "RouteBooking_fromHubId_fkey" FOREIGN KEY ("fromHubId") REFERENCES "public"."Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouteBooking" ADD CONSTRAINT "RouteBooking_toHubId_fkey" FOREIGN KEY ("toHubId") REFERENCES "public"."Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouteBooking" ADD CONSTRAINT "RouteBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildWarehouse" ADD CONSTRAINT "GuildWarehouse_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildWarehouse" ADD CONSTRAINT "GuildWarehouse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildLog" ADD CONSTRAINT "GuildLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildLog" ADD CONSTRAINT "GuildLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildInvite" ADD CONSTRAINT "GuildInvite_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildInvite" ADD CONSTRAINT "GuildInvite_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildInvite" ADD CONSTRAINT "GuildInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildRequest" ADD CONSTRAINT "GuildRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildRequest" ADD CONSTRAINT "GuildRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildAchievement" ADD CONSTRAINT "GuildAchievement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildChannel" ADD CONSTRAINT "GuildChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildAlliance" ADD CONSTRAINT "GuildAlliance_from_guild_id_fkey" FOREIGN KEY ("from_guild_id") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuildAlliance" ADD CONSTRAINT "GuildAlliance_to_guild_id_fkey" FOREIGN KEY ("to_guild_id") REFERENCES "public"."Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllianceChannel" ADD CONSTRAINT "AllianceChannel_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "public"."GuildAlliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllianceMission" ADD CONSTRAINT "AllianceMission_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "public"."GuildAlliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllianceMissionParticipant" ADD CONSTRAINT "AllianceMissionParticipant_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."AllianceMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllianceMissionParticipant" ADD CONSTRAINT "AllianceMissionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionInstance" ADD CONSTRAINT "MissionInstance_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionInstance" ADD CONSTRAINT "MissionInstance_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."MissionDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionInstance" ADD CONSTRAINT "MissionInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_guildChannelId_fkey" FOREIGN KEY ("guildChannelId") REFERENCES "public"."GuildChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_allianceChannelId_fkey" FOREIGN KEY ("allianceChannelId") REFERENCES "public"."AllianceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatReaction" ADD CONSTRAINT "ChatReaction_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatReaction" ADD CONSTRAINT "ChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMention" ADD CONSTRAINT "ChatMention_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMention" ADD CONSTRAINT "ChatMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
