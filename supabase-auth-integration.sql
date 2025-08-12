-- Proper Supabase Auth Integration
-- Based on official Supabase documentation patterns

-- First, update our User table to properly reference auth.users
-- Note: This requires careful migration to avoid breaking existing data

-- Step 1: Create the proper User table structure
CREATE TABLE IF NOT EXISTS public."User_New" (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  "caravanSlotsUnlocked" integer DEFAULT 3,
  "caravanSlotsPremium" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public."User_New" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for User table
CREATE POLICY "Users can view own data" ON public."User_New"
  FOR ALL USING (auth.uid() = id);

-- Step 2: Create trigger function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public."User_New" (id, email, "caravanSlotsUnlocked", "caravanSlotsPremium")
  VALUES (
    NEW.id,
    NEW.email,
    3, -- Default caravan slots
    0  -- No premium slots initially
  );
  
  -- Also create a default Profile
  INSERT INTO public."Profile" ("userId", display)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1), 'Trader' || substr(NEW.id::text, 1, 8))
  )
  ON CONFLICT ("userId") DO NOTHING;
  
  -- Create default Wallet
  INSERT INTO public."Wallet" ("userId", gold)
  VALUES (NEW.id, 1000)
  ON CONFLICT ("userId") DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger for automatic user sync
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create trigger function for user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Delete from User_New table (which will cascade to related tables)
  DELETE FROM public."User_New" WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Step 5: Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Step 6: Migration script to move existing data
-- (Only run this after testing the new structure)
/*
-- Copy existing data to new table
INSERT INTO public."User_New" (id, email, "caravanSlotsUnlocked", "caravanSlotsPremium", "createdAt", "updatedAt")
SELECT id, email, "caravanSlotsUnlocked", "caravanSlotsPremium", "createdAt", "updatedAt"
FROM public."User"
ON CONFLICT (id) DO NOTHING;

-- Update foreign key references in related tables
UPDATE public."Profile" SET "userId" = "userId" WHERE "userId" IN (SELECT id FROM public."User_New");
UPDATE public."Wallet" SET "userId" = "userId" WHERE "userId" IN (SELECT id FROM public."User_New");
UPDATE public."Inventory" SET "userId" = "userId" WHERE "userId" IN (SELECT id FROM public."User_New");
UPDATE public."MissionInstance" SET "userId" = "userId" WHERE "userId" IN (SELECT id FROM public."User_New");

-- Drop old table and rename new one
DROP TABLE public."User";
ALTER TABLE public."User_New" RENAME TO "User";
*/

-- Step 7: Test the trigger
-- To test: create a user via Supabase auth, and it should automatically create User, Profile, and Wallet records

-- Step 8: Update Prisma schema after migration
-- The User model should reference auth.users properly:
/*
model User {
  id                   String   @id @db.Uuid // References auth.users(id)
  email                String?
  caravanSlotsUnlocked Int      @default(3) @map("caravanSlotsUnlocked")
  caravanSlotsPremium  Int      @default(0) @map("caravanSlotsPremium")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  profile              Profile?
  wallets              Wallet[]
  // ... other relations
}
*/