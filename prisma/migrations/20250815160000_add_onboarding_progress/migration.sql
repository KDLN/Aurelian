-- Add onboarding progress tracking to Profile table
ALTER TABLE "Profile" ADD COLUMN "onboarding_progress" JSONB;