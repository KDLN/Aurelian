-- Alliance System Enhancements Migration
-- AddColumn to GuildAlliance
ALTER TABLE "GuildAlliance" ADD COLUMN "travel_tax_reduction" INTEGER NOT NULL DEFAULT 35;
ALTER TABLE "GuildAlliance" ADD COLUMN "auction_fee_reduction" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "GuildAlliance" ADD COLUMN "terms" JSONB;
ALTER TABLE "GuildAlliance" ADD COLUMN "proposal_message" TEXT;
ALTER TABLE "GuildAlliance" ADD COLUMN "broken_at" TIMESTAMP(3);
ALTER TABLE "GuildAlliance" ADD COLUMN "broken_by" UUID;
ALTER TABLE "GuildAlliance" ADD COLUMN "broken_reason" TEXT;

-- CreateTable AllianceChannel
CREATE TABLE "AllianceChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "allianceId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'alliance-general',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllianceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable AllianceMission
CREATE TABLE "AllianceMission" (
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

-- CreateTable AllianceMissionParticipant
CREATE TABLE "AllianceMissionParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "missionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "guildId" UUID NOT NULL,
    "contribution" JSONB,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllianceMissionParticipant_pkey" PRIMARY KEY ("id")
);

-- AddColumn to ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN "allianceChannelId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "AllianceChannel_allianceId_name_key" ON "AllianceChannel"("allianceId", "name");
CREATE INDEX "AllianceChannel_allianceId_idx" ON "AllianceChannel"("allianceId");
CREATE INDEX "AllianceChannel_is_active_idx" ON "AllianceChannel"("is_active");
CREATE INDEX "AllianceMission_allianceId_idx" ON "AllianceMission"("allianceId");
CREATE INDEX "AllianceMission_status_idx" ON "AllianceMission"("status");
CREATE INDEX "AllianceMission_expires_at_idx" ON "AllianceMission"("expires_at");
CREATE UNIQUE INDEX "AllianceMissionParticipant_missionId_userId_key" ON "AllianceMissionParticipant"("missionId", "userId");
CREATE INDEX "AllianceMissionParticipant_missionId_idx" ON "AllianceMissionParticipant"("missionId");
CREATE INDEX "AllianceMissionParticipant_userId_idx" ON "AllianceMissionParticipant"("userId");
CREATE INDEX "AllianceMissionParticipant_guildId_idx" ON "AllianceMissionParticipant"("guildId");
CREATE INDEX "GuildAlliance_accepted_at_idx" ON "GuildAlliance"("accepted_at");
CREATE INDEX "ChatMessage_allianceChannelId_createdAt_idx" ON "ChatMessage"("allianceChannelId", "createdAt");

-- AddForeignKey
ALTER TABLE "AllianceChannel" ADD CONSTRAINT "AllianceChannel_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "GuildAlliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllianceMission" ADD CONSTRAINT "AllianceMission_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "GuildAlliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllianceMissionParticipant" ADD CONSTRAINT "AllianceMissionParticipant_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "AllianceMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllianceMissionParticipant" ADD CONSTRAINT "AllianceMissionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_allianceChannelId_fkey" FOREIGN KEY ("allianceChannelId") REFERENCES "AllianceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;