-- Debug SQL to check user crafting setup
-- Run this in Supabase SQL editor

-- 1. Check if your user exists and has crafting fields
SELECT 
  id,
  email,
  crafting_level,
  crafting_xp,
  crafting_xp_next,
  caravan_slots_unlocked,
  "createdAt"
FROM "User" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- 2. Check all blueprints in database
SELECT 
  key,
  starter_recipe,
  required_level,
  category,
  xp_reward,
  "timeMin"
FROM "Blueprint"
WHERE starter_recipe = true
ORDER BY required_level;

-- 3. Check all blueprints (including non-starter)
SELECT 
  key,
  starter_recipe,
  required_level,
  category
FROM "Blueprint"
ORDER BY starter_recipe DESC, required_level;

-- 4. Check if BlueprintUnlock table has any records for users
SELECT 
  u.email,
  bu.unlocked_by,
  b.key as blueprint_key,
  bu.unlocked_at
FROM "BlueprintUnlock" bu
JOIN "User" u ON bu."userId" = u.id
JOIN "Blueprint" b ON bu."blueprintId" = b.id
ORDER BY bu.unlocked_at DESC;

-- 5. Update users to have crafting fields if missing
UPDATE "User" 
SET 
  crafting_level = COALESCE(crafting_level, 1),
  crafting_xp = COALESCE(crafting_xp, 0),
  crafting_xp_next = COALESCE(crafting_xp_next, 100)
WHERE crafting_level IS NULL OR crafting_xp IS NULL OR crafting_xp_next IS NULL;

-- 6. Final check - show what should be available to a level 1 player
SELECT 
  b.key,
  b.starter_recipe,
  b.required_level,
  b.category,
  i.name as output_name
FROM "Blueprint" b
JOIN "ItemDef" i ON b."outputId" = i.id
WHERE b.starter_recipe = true OR b.required_level <= 1
ORDER BY b.starter_recipe DESC, b.required_level;