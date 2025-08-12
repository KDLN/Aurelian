-- Migration to add expanded crafting system fields
-- This should be run in the Supabase dashboard SQL editor

-- Add new fields to User table for crafting progression
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "crafting_level" INTEGER DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "crafting_xp" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "crafting_xp_next" INTEGER DEFAULT 100;

-- Add new fields to Blueprint table for expanded crafting
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "output_qty" INTEGER DEFAULT 1;
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "required_level" INTEGER DEFAULT 1;
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "xp_reward" INTEGER DEFAULT 10;
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "discoverable" BOOLEAN DEFAULT false;
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "starter_recipe" BOOLEAN DEFAULT true;
ALTER TABLE "Blueprint" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Add new fields to CraftJob table for quality and timing
ALTER TABLE "CraftJob" ADD COLUMN IF NOT EXISTS "quality" TEXT DEFAULT 'common';
ALTER TABLE "CraftJob" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP;

-- Create BlueprintUnlock table for recipe discovery
CREATE TABLE IF NOT EXISTS "BlueprintUnlock" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "blueprintId" UUID NOT NULL REFERENCES "Blueprint"(id) ON DELETE CASCADE,
  "unlocked_at" TIMESTAMP DEFAULT NOW(),
  "unlocked_by" TEXT,
  UNIQUE("userId", "blueprintId")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "BlueprintUnlock_userId_idx" ON "BlueprintUnlock"("userId");

-- Update existing blueprints with starter recipe flag
UPDATE "Blueprint" SET "starter_recipe" = true WHERE "key" IN ('craft_iron_ingot', 'craft_leather_roll', 'craft_healing_tonic');