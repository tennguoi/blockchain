ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "walletNonce" TEXT,
    ADD COLUMN IF NOT EXISTS "walletNonceExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_walletNonce_key"
    ON "User"("walletNonce");
