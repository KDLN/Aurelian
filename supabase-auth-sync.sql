-- Supabase Auth Integration: Sync auth.users with public.User table
-- This ensures every authenticated user has a corresponding User record

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.User table when auth.users record is created
  INSERT INTO public."User" (id, email, "caravanSlotsUnlocked", "caravanSlotsPremium")
  VALUES (
    NEW.id,
    NEW.email,
    3, -- Default 3 caravan slots
    0  -- No premium slots by default
  );
  
  -- Also create a default profile with unique display name
  INSERT INTO public."Profile" ("userId", display)
  VALUES (
    NEW.id,
    'Trader' || substr(NEW.id::text, 1, 8) -- Trader + first 8 chars of UUID
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically sync new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user updates (email changes, etc.)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in public.User table when auth.users email changes
  UPDATE public."User"
  SET 
    email = NEW.email,
    "updatedAt" = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing update trigger if it exists  
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete user from public.User table when auth.users record is deleted
  -- This will cascade delete Profile, missions, etc. due to foreign key constraints
  DELETE FROM public."User" WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing delete trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create trigger for user deletion
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Backfill existing auth.users that don't have User records
INSERT INTO public."User" (id, email, "caravanSlotsUnlocked", "caravanSlotsPremium")
SELECT 
  au.id,
  au.email,
  3, -- Default caravan slots
  0  -- No premium slots
FROM auth.users au
LEFT JOIN public."User" u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill existing users that don't have Profile records
INSERT INTO public."Profile" ("userId", display)
SELECT 
  u.id,
  'Trader' || substr(u.id::text, 1, 8)
FROM public."User" u
LEFT JOIN public."Profile" p ON u.id = p."userId"
WHERE p."userId" IS NULL
ON CONFLICT ("userId") DO NOTHING;