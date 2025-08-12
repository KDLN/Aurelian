-- Row Level Security (RLS) Policies for Supabase
-- These policies control who can read/write data from the frontend

-- Enable RLS on all tables
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MissionInstance" ENABLE ROW LEVEL SECURITY;

-- User table policies
DROP POLICY IF EXISTS "Users can view own user record" ON public."User";
CREATE POLICY "Users can view own user record"
ON public."User" FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own user record" ON public."User";
CREATE POLICY "Users can update own user record"
ON public."User" FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own user record" ON public."User";
CREATE POLICY "Users can insert own user record"
ON public."User" FOR INSERT
WITH CHECK (auth.uid() = id);

-- Profile table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public."Profile";
CREATE POLICY "Users can view own profile"
ON public."Profile" FOR SELECT
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can update own profile" ON public."Profile";
CREATE POLICY "Users can update own profile"
ON public."Profile" FOR UPDATE
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can insert own profile" ON public."Profile";
CREATE POLICY "Users can insert own profile"
ON public."Profile" FOR INSERT
WITH CHECK (auth.uid() = "userId");

-- Wallet table policies
DROP POLICY IF EXISTS "Users can view own wallet" ON public."Wallet";
CREATE POLICY "Users can view own wallet"
ON public."Wallet" FOR SELECT
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can update own wallet" ON public."Wallet";
CREATE POLICY "Users can update own wallet"
ON public."Wallet" FOR UPDATE
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can insert own wallet" ON public."Wallet";
CREATE POLICY "Users can insert own wallet"
ON public."Wallet" FOR INSERT
WITH CHECK (auth.uid() = "userId");

-- Inventory table policies
DROP POLICY IF EXISTS "Users can view own inventory" ON public."Inventory";
CREATE POLICY "Users can view own inventory"
ON public."Inventory" FOR SELECT
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can update own inventory" ON public."Inventory";
CREATE POLICY "Users can update own inventory"
ON public."Inventory" FOR UPDATE
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can insert own inventory" ON public."Inventory";
CREATE POLICY "Users can insert own inventory"
ON public."Inventory" FOR INSERT
WITH CHECK (auth.uid() = "userId");

-- Mission Instance table policies
DROP POLICY IF EXISTS "Users can view own missions" ON public."MissionInstance";
CREATE POLICY "Users can view own missions"
ON public."MissionInstance" FOR SELECT
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can update own missions" ON public."MissionInstance";
CREATE POLICY "Users can update own missions"
ON public."MissionInstance" FOR UPDATE
USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Users can insert own missions" ON public."MissionInstance";
CREATE POLICY "Users can insert own missions"
ON public."MissionInstance" FOR INSERT
WITH CHECK (auth.uid() = "userId");

-- Read-only policies for reference tables (ItemDef, MissionDef, etc.)
DROP POLICY IF EXISTS "Anyone can view item definitions" ON public."ItemDef";
CREATE POLICY "Anyone can view item definitions"
ON public."ItemDef" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view mission definitions" ON public."MissionDef";
CREATE POLICY "Anyone can view mission definitions"
ON public."MissionDef" FOR SELECT
TO authenticated
USING (true);

-- Blueprint table (read-only for users)
DROP POLICY IF EXISTS "Anyone can view blueprints" ON public."Blueprint";
CREATE POLICY "Anyone can view blueprints"
ON public."Blueprint" FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;