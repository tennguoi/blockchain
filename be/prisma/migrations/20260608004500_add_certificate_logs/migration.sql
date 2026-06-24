-- Add certificate lifecycle and logging tables without modifying the existing "User" table.

CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "certificateCode" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "graduationYear" TEXT NOT NULL,
    "gpa" TEXT NOT NULL,
    "fileCid" TEXT,
    "metadataCid" TEXT,
    "certificateHash" TEXT,
    "txHash" TEXT,
    "revokeTxHash" TEXT,
    "contractAddress" TEXT,
    "chainId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revokedReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "studentUserId" TEXT,
    "issuerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_certificateCode_key"
    ON "Certificate"("certificateCode");

ALTER TABLE "Certificate"
    ADD CONSTRAINT "Certificate_studentUserId_fkey"
    FOREIGN KEY ("studentUserId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "Certificate"
    ADD CONSTRAINT "Certificate_issuerUserId_fkey"
    FOREIGN KEY ("issuerUserId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "VerificationLog" (
    "id" TEXT NOT NULL,
    "certificateCode" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "verifierIpHash" TEXT,
    "userAgent" TEXT,
    "certificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VerificationLog"
    ADD CONSTRAINT "VerificationLog_certificateId_fkey"
    FOREIGN KEY ("certificateId")
    REFERENCES "Certificate"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
