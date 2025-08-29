-- CreateTable
CREATE TABLE "public"."ServerMission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "globalRequirements" JSONB NOT NULL,
    "globalProgress" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "tiers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServerMissionParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "missionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "guildId" UUID,
    "contribution" JSONB NOT NULL,
    "tier" TEXT,
    "rank" INTEGER,
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerMissionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerMission_status_endsAt_idx" ON "public"."ServerMission"("status", "endsAt");

-- CreateIndex
CREATE INDEX "ServerMission_type_idx" ON "public"."ServerMission"("type");

-- CreateIndex
CREATE INDEX "ServerMission_startedAt_idx" ON "public"."ServerMission"("startedAt");

-- CreateIndex
CREATE INDEX "ServerMission_createdAt_idx" ON "public"."ServerMission"("createdAt");

-- CreateIndex
CREATE INDEX "ServerMissionParticipant_missionId_idx" ON "public"."ServerMissionParticipant"("missionId");

-- CreateIndex
CREATE INDEX "ServerMissionParticipant_userId_idx" ON "public"."ServerMissionParticipant"("userId");

-- CreateIndex
CREATE INDEX "ServerMissionParticipant_guildId_idx" ON "public"."ServerMissionParticipant"("guildId");

-- CreateIndex
CREATE INDEX "ServerMissionParticipant_tier_idx" ON "public"."ServerMissionParticipant"("tier");

-- CreateIndex
CREATE INDEX "ServerMissionParticipant_rank_idx" ON "public"."ServerMissionParticipant"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "ServerMissionParticipant_missionId_userId_key" ON "public"."ServerMissionParticipant"("missionId", "userId");

-- AddForeignKey
ALTER TABLE "public"."ServerMissionParticipant" ADD CONSTRAINT "ServerMissionParticipant_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."ServerMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServerMissionParticipant" ADD CONSTRAINT "ServerMissionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
