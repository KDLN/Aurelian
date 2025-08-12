-- CreateTable
CREATE TABLE "MarketEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "itemId" UUID,
    "hubId" UUID,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "priceMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PriceTick" ADD COLUMN     "high" INTEGER,
ADD COLUMN     "hubId" UUID,
ADD COLUMN     "low" INTEGER,
ADD COLUMN     "priceMultiplier" DOUBLE PRECISION,
ADD COLUMN     "supplyDemandRatio" DOUBLE PRECISION,
ADD COLUMN     "trend" TEXT,
ADD COLUMN     "volatility" DOUBLE PRECISION,
ADD COLUMN     "volume" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "MarketEvent_isActive_startedAt_idx" ON "MarketEvent"("isActive", "startedAt");

-- CreateIndex
CREATE INDEX "MarketEvent_itemId_isActive_idx" ON "MarketEvent"("itemId", "isActive");

-- CreateIndex
CREATE INDEX "MarketEvent_hubId_isActive_idx" ON "MarketEvent"("hubId", "isActive");

-- CreateIndex
CREATE INDEX "PriceTick_hubId_at_idx" ON "PriceTick"("hubId", "at");

-- CreateIndex
CREATE INDEX "PriceTick_itemId_hubId_at_idx" ON "PriceTick"("itemId", "hubId", "at");

-- AddForeignKey
ALTER TABLE "MarketEvent" ADD CONSTRAINT "MarketEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketEvent" ADD CONSTRAINT "MarketEvent_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTick" ADD CONSTRAINT "PriceTick_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;