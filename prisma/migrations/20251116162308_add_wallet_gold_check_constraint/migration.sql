-- Add CHECK constraint to prevent negative gold balances
-- This provides database-level protection against data corruption

ALTER TABLE "Wallet"
ADD CONSTRAINT "wallet_gold_non_negative"
CHECK ("gold" >= 0);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT "wallet_gold_non_negative" ON "Wallet" IS
'Ensures gold balance cannot be negative. Use WalletService.subtractGold() with allowNegative=true for admin operations if needed.';
