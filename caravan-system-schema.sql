-- Multiple Caravan System Database Schema Changes
-- Phase 1: Core 3-Caravan Implementation

-- 1. Add caravan slot tracking to User table
ALTER TABLE "User" 
  ADD COLUMN caravan_slots_unlocked INTEGER DEFAULT 3,
  ADD COLUMN caravan_slots_premium INTEGER DEFAULT 0;

-- 2. Add caravan slot assignment to MissionInstance table  
ALTER TABLE "MissionInstance"
  ADD COLUMN caravan_slot INTEGER DEFAULT 1 CHECK (caravan_slot >= 1 AND caravan_slot <= 4);

-- 3. Create index for efficient caravan slot queries
CREATE INDEX idx_mission_instance_user_caravan_slot 
  ON "MissionInstance" (userId, caravan_slot, status);

-- 4. Add unique constraint to prevent double-booking caravan slots
ALTER TABLE "MissionInstance" 
  ADD CONSTRAINT unique_user_caravan_slot_active 
  UNIQUE (userId, caravan_slot, status) 
  DEFERRABLE INITIALLY DEFERRED;

-- Note: The UNIQUE constraint with status column will only work if we use
-- a partial unique index for active missions only:
DROP CONSTRAINT IF EXISTS unique_user_caravan_slot_active;

CREATE UNIQUE INDEX unique_active_caravan_slot 
  ON "MissionInstance" (userId, caravan_slot) 
  WHERE status = 'active';

-- 5. Migration script to backfill existing missions
-- Assign existing active missions to caravan slot 1
UPDATE "MissionInstance" 
SET caravan_slot = 1 
WHERE caravan_slot IS NULL AND status = 'active';

-- 6. Future progression system preparation
CREATE TABLE "CaravanProgression" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 4),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  unlock_method VARCHAR(50) DEFAULT 'default', -- 'progression', 'premium', 'default'
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(userId, slot_number)
);

-- Initialize default caravan slots for existing users
INSERT INTO "CaravanProgression" (userId, slot_number, unlock_method)
SELECT id, 1, 'default' FROM "User" 
ON CONFLICT DO NOTHING;

INSERT INTO "CaravanProgression" (userId, slot_number, unlock_method)
SELECT id, 2, 'default' FROM "User"
ON CONFLICT DO NOTHING;

INSERT INTO "CaravanProgression" (userId, slot_number, unlock_method)
SELECT id, 3, 'default' FROM "User"
ON CONFLICT DO NOTHING;

-- 7. Helper function to check available caravan slots
CREATE OR REPLACE FUNCTION get_available_caravan_slots(user_id UUID) 
RETURNS TABLE(slot_number INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH unlocked_slots AS (
    SELECT cp.slot_number 
    FROM "CaravanProgression" cp 
    WHERE cp.userId = user_id
  ),
  active_slots AS (
    SELECT mi.caravan_slot 
    FROM "MissionInstance" mi 
    WHERE mi.userId = user_id AND mi.status = 'active'
  )
  SELECT us.slot_number 
  FROM unlocked_slots us
  LEFT JOIN active_slots as ON us.slot_number = as.caravan_slot
  WHERE as.caravan_slot IS NULL
  ORDER BY us.slot_number;
END;
$$ LANGUAGE plpgsql;

-- 8. Example usage queries:

-- Check user's available slots:
-- SELECT * FROM get_available_caravan_slots('user-uuid-here');

-- Get user's caravan status:
-- SELECT 
--   u.caravan_slots_unlocked,
--   u.caravan_slots_premium,
--   COUNT(mi.id) as active_missions,
--   ARRAY_AGG(mi.caravan_slot ORDER BY mi.caravan_slot) as occupied_slots
-- FROM "User" u
-- LEFT JOIN "MissionInstance" mi ON u.id = mi.userId AND mi.status = 'active'
-- WHERE u.id = 'user-uuid-here'
-- GROUP BY u.id, u.caravan_slots_unlocked, u.caravan_slots_premium;