/*
  Warnings:

  - The primary key for the `Listing` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `item` on the `Listing` table. All the data in the column will be lost.
  - The `id` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Mission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `item` on the `Mission` table. All the data in the column will be lost.
  - The `id` column on the `Mission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `risk` column on the `Mission` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `PriceTick` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `item` on the `PriceTick` table. All the data in the column will be lost.
  - The `id` column on the `PriceTick` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `itemId` to the `Listing` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `sellerId` on the `Listing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `itemId` to the `Mission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Mission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Mission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemId` to the `PriceTick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('active', 'sold', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('queued', 'running', 'complete', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "public"."MissionRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled', 'breached');

-- DropForeignKey
ALTER TABLE "public"."Listing" DROP CONSTRAINT "Listing_sellerId_fkey";

-- AlterTable
ALTER TABLE "public"."Listing" DROP CONSTRAINT "Listing_pkey",
DROP COLUMN "item",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "itemId" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "sellerId",
ADD COLUMN     "sellerId" UUID NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."ListingStatus" NOT NULL DEFAULT 'active',
ADD CONSTRAINT "Listing_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_pkey",
DROP COLUMN "item",
ADD COLUMN     "itemId" UUID NOT NULL,
ADD COLUMN     "status" "public"."JobStatus" NOT NULL DEFAULT 'running',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "risk",
ADD COLUMN     "risk" "public"."MissionRisk" NOT NULL DEFAULT 'MEDIUM',
ADD CONSTRAINT "Mission_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."PriceTick" DROP CONSTRAINT "PriceTick_pkey",
DROP COLUMN "item",
ADD COLUMN     "itemId" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "PriceTick_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "display" TEXT NOT NULL DEFAULT 'Trader',
    "avatar" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Character" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemDef" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "public"."ItemRarity" NOT NULL DEFAULT 'COMMON',
    "stack" INTEGER NOT NULL DEFAULT 9999,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "characterId" UUID,
    "userId" UUID,
    "itemId" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT 'warehouse',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blueprint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "outputId" UUID NOT NULL,
    "inputs" JSONB NOT NULL,
    "timeMin" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CraftJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "blueprintId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'queued',
    "eta" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CraftJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LedgerTx" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hub" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "safe" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Link" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "aId" UUID NOT NULL,
    "bId" UUID NOT NULL,
    "baseDist" INTEGER NOT NULL,
    "baseRisk" DOUBLE PRECISION NOT NULL,
    "toll" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailNode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrailSeg" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "aId" UUID NOT NULL,
    "bId" UUID NOT NULL,
    "risk" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailSeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RouteBooking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "fromHubId" UUID,
    "toHubId" UUID,
    "summary" JSONB NOT NULL,
    "tollPaid" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDef_key_key" ON "public"."ItemDef"("key");

-- CreateIndex
CREATE INDEX "Inventory_userId_idx" ON "public"."Inventory"("userId");

-- CreateIndex
CREATE INDEX "Inventory_characterId_idx" ON "public"."Inventory"("characterId");

-- CreateIndex
CREATE INDEX "Inventory_itemId_idx" ON "public"."Inventory"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_key_key" ON "public"."Blueprint"("key");

-- CreateIndex
CREATE INDEX "CraftJob_userId_idx" ON "public"."CraftJob"("userId");

-- CreateIndex
CREATE INDEX "CraftJob_status_idx" ON "public"."CraftJob"("status");

-- CreateIndex
CREATE INDEX "CraftJob_eta_idx" ON "public"."CraftJob"("eta");

-- CreateIndex
CREATE INDEX "LedgerTx_userId_createdAt_idx" ON "public"."LedgerTx"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Contract_ownerId_idx" ON "public"."Contract"("ownerId");

-- CreateIndex
CREATE INDEX "Contract_itemId_idx" ON "public"."Contract"("itemId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "public"."Contract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Hub_key_key" ON "public"."Hub"("key");

-- CreateIndex
CREATE INDEX "Link_aId_idx" ON "public"."Link"("aId");

-- CreateIndex
CREATE INDEX "Link_bId_idx" ON "public"."Link"("bId");

-- CreateIndex
CREATE INDEX "TrailNode_userId_idx" ON "public"."TrailNode"("userId");

-- CreateIndex
CREATE INDEX "TrailSeg_userId_idx" ON "public"."TrailSeg"("userId");

-- CreateIndex
CREATE INDEX "RouteBooking_userId_createdAt_idx" ON "public"."RouteBooking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "public"."Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_itemId_idx" ON "public"."Listing"("itemId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "public"."Listing"("status");

-- CreateIndex
CREATE INDEX "Mission_userId_idx" ON "public"."Mission"("userId");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "public"."Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_eta_idx" ON "public"."Mission"("eta");

-- CreateIndex
CREATE INDEX "PriceTick_itemId_at_idx" ON "public"."PriceTick"("itemId", "at");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blueprint" ADD CONSTRAINT "Blueprint_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CraftJob" ADD CONSTRAINT "CraftJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CraftJob" ADD CONSTRAINT "CraftJob_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "public"."Blueprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LedgerTx" ADD CONSTRAINT "LedgerTx_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceTick" ADD CONSTRAINT "PriceTick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ItemDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_aId_fkey" FOREIGN KEY ("aId") REFERENCES "public"."Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_bId_fkey" FOREIGN KEY ("bId") REFERENCES "public"."Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailNode" ADD CONSTRAINT "TrailNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailSeg" ADD CONSTRAINT "TrailSeg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailSeg" ADD CONSTRAINT "TrailSeg_aId_fkey" FOREIGN KEY ("aId") REFERENCES "public"."TrailNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrailSeg" ADD CONSTRAINT "TrailSeg_bId_fkey" FOREIGN KEY ("bId") REFERENCES "public"."TrailNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouteBooking" ADD CONSTRAINT "RouteBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouteBooking" ADD CONSTRAINT "RouteBooking_fromHubId_fkey" FOREIGN KEY ("fromHubId") REFERENCES "public"."Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouteBooking" ADD CONSTRAINT "RouteBooking_toHubId_fkey" FOREIGN KEY ("toHubId") REFERENCES "public"."Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;
