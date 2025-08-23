-- Mail System Migration
-- This file contains the SQL to add the mail system to the existing database

-- Add new enum values to ChannelType
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'DIRECT';

-- Create new enums for mail system
DO $$ BEGIN
    CREATE TYPE "MailStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MailPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Mail table
CREATE TABLE IF NOT EXISTS "Mail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "status" "MailStatus" NOT NULL DEFAULT 'UNREAD',
    "priority" "MailPriority" NOT NULL DEFAULT 'NORMAL',
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "parent_mail_id" UUID,
    "attachments" JSONB,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mail_pkey" PRIMARY KEY ("id")
);

-- Create MailFolder table
CREATE TABLE IF NOT EXISTS "MailFolder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "mail_count" INTEGER NOT NULL DEFAULT 0,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailFolder_pkey" PRIMARY KEY ("id")
);

-- Create MailBlock table
CREATE TABLE IF NOT EXISTS "MailBlock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailBlock_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Mail table
CREATE INDEX IF NOT EXISTS "Mail_recipient_id_status_idx" ON "Mail"("recipient_id", "status");
CREATE INDEX IF NOT EXISTS "Mail_sender_id_idx" ON "Mail"("sender_id");
CREATE INDEX IF NOT EXISTS "Mail_createdAt_idx" ON "Mail"("createdAt");
CREATE INDEX IF NOT EXISTS "Mail_parent_mail_id_idx" ON "Mail"("parent_mail_id");

-- Create indexes for MailFolder table
CREATE UNIQUE INDEX IF NOT EXISTS "MailFolder_userId_name_key" ON "MailFolder"("userId", "name");
CREATE INDEX IF NOT EXISTS "MailFolder_userId_idx" ON "MailFolder"("userId");

-- Create indexes for MailBlock table
CREATE UNIQUE INDEX IF NOT EXISTS "MailBlock_blocker_id_blocked_id_key" ON "MailBlock"("blocker_id", "blocked_id");
CREATE INDEX IF NOT EXISTS "MailBlock_blocker_id_idx" ON "MailBlock"("blocker_id");
CREATE INDEX IF NOT EXISTS "MailBlock_blocked_id_idx" ON "MailBlock"("blocked_id");

-- Add foreign key constraints
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mail" ADD CONSTRAINT "Mail_parent_mail_id_fkey" FOREIGN KEY ("parent_mail_id") REFERENCES "Mail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MailFolder" ADD CONSTRAINT "MailFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MailBlock" ADD CONSTRAINT "MailBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailBlock" ADD CONSTRAINT "MailBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create trigger to auto-update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_mail_updated_at BEFORE UPDATE ON "Mail" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_mailfolder_updated_at BEFORE UPDATE ON "MailFolder" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default folders for existing users
INSERT INTO "MailFolder" ("userId", "name", "is_system", "sort_order")
SELECT 
    "id" as "userId",
    'Inbox' as "name",
    true as "is_system",
    0 as "sort_order"
FROM "User"
WHERE NOT EXISTS (
    SELECT 1 FROM "MailFolder" 
    WHERE "userId" = "User"."id" AND "name" = 'Inbox'
);

INSERT INTO "MailFolder" ("userId", "name", "is_system", "sort_order")
SELECT 
    "id" as "userId",
    'Sent' as "name",
    true as "is_system",
    1 as "sort_order"
FROM "User"
WHERE NOT EXISTS (
    SELECT 1 FROM "MailFolder" 
    WHERE "userId" = "User"."id" AND "name" = 'Sent'
);

INSERT INTO "MailFolder" ("userId", "name", "is_system", "sort_order")
SELECT 
    "id" as "userId",
    'Archived' as "name",
    true as "is_system",
    2 as "sort_order"
FROM "User"
WHERE NOT EXISTS (
    SELECT 1 FROM "MailFolder" 
    WHERE "userId" = "User"."id" AND "name" = 'Archived'
);