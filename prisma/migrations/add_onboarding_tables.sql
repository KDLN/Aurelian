-- Add Onboarding System Tables
-- Run this SQL directly in Supabase SQL Editor

-- Create StepStatus enum
CREATE TYPE "StepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- Create OnboardingStep table
CREATE TABLE "OnboardingStep" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rewardsClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingStep_userId_stepKey_key" UNIQUE ("userId", "stepKey")
);

-- Create indexes for OnboardingStep
CREATE INDEX "OnboardingStep_userId_status_idx" ON "OnboardingStep"("userId", "status");
CREATE INDEX "OnboardingStep_stepKey_status_idx" ON "OnboardingStep"("stepKey", "status");
CREATE INDEX "OnboardingStep_completedAt_idx" ON "OnboardingStep"("completedAt");

-- Create OnboardingMetrics table
CREATE TABLE "OnboardingMetrics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "stepKey" TEXT NOT NULL,
    "started" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "avgTimeToComplete" INTEGER NOT NULL DEFAULT 0,
    "medianTime" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardsClaimed" INTEGER NOT NULL DEFAULT 0,
    "totalGoldGranted" INTEGER NOT NULL DEFAULT 0,
    "totalItemsGranted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingMetrics_date_stepKey_key" UNIQUE ("date", "stepKey")
);

-- Create indexes for OnboardingMetrics
CREATE INDEX "OnboardingMetrics_date_idx" ON "OnboardingMetrics"("date");
CREATE INDEX "OnboardingMetrics_stepKey_idx" ON "OnboardingMetrics"("stepKey");

-- Create OnboardingSession table
CREATE TABLE "OnboardingSession" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL UNIQUE,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalGoldEarned" INTEGER NOT NULL DEFAULT 0,
    "totalItemsEarned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OnboardingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for OnboardingSession
CREATE INDEX "OnboardingSession_startedAt_idx" ON "OnboardingSession"("startedAt");
CREATE INDEX "OnboardingSession_completedAt_idx" ON "OnboardingSession"("completedAt");
CREATE INDEX "OnboardingSession_currentStep_idx" ON "OnboardingSession"("currentStep");

-- Add trigger to update updatedAt timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_step_updated_at BEFORE UPDATE ON "OnboardingStep"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_metrics_updated_at BEFORE UPDATE ON "OnboardingMetrics"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT
    'OnboardingStep' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'OnboardingStep'
UNION ALL
SELECT
    'OnboardingMetrics' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'OnboardingMetrics'
UNION ALL
SELECT
    'OnboardingSession' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'OnboardingSession';
