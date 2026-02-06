/*
  Warnings:

  - You are about to drop the column `token` on the `PasswordResetToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tokenHash]` on the table `PasswordResetToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `PasswordResetToken` table without a default value. This is not possible if the table is not empty.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "PasswordResetToken_token_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_token_key";

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "token",
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastRevocationAt" TIMESTAMP(3),
ALTER COLUMN "password" SET NOT NULL;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
