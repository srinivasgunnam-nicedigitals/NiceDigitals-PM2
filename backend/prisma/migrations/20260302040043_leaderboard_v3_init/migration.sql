/*
  Warnings:

  - You are about to drop the `ScoreEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LeaderboardEventType" AS ENUM ('DESIGN_HANDOFF', 'DESIGN_REVERT', 'DEV_REVERT_TO_DESIGN', 'DEV_TO_QA', 'QA_REJECTION', 'QA_CLEARANCE', 'UAT_REJECTION', 'PROJECT_COMPLETED_ONTIME', 'PROJECT_COMPLETED_DELAYED');

-- DropForeignKey
ALTER TABLE "ScoreEntry" DROP CONSTRAINT "ScoreEntry_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ScoreEntry" DROP CONSTRAINT "ScoreEntry_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ScoreEntry" DROP CONSTRAINT "ScoreEntry_userId_fkey";

-- DropTable
DROP TABLE "ScoreEntry";

-- CreateTable
CREATE TABLE "RoleLeaderboardEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "revertCount" INTEGER NOT NULL DEFAULT 0,
    "onTimeCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleLeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEventLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "LeaderboardEventType" NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "eventType" "LeaderboardEventType" NOT NULL,
    "basePoints" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardConfigSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "eventType" "LeaderboardEventType" NOT NULL,
    "basePoints" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardConfigSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleLeaderboardEntry_tenantId_role_month_year_idx" ON "RoleLeaderboardEntry"("tenantId", "role", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RoleLeaderboardEntry_tenantId_userId_role_month_year_key" ON "RoleLeaderboardEntry"("tenantId", "userId", "role", "month", "year");

-- CreateIndex
CREATE INDEX "LeaderboardEventLog_tenantId_month_year_idx" ON "LeaderboardEventLog"("tenantId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEventLog_projectId_userId_eventType_month_year_key" ON "LeaderboardEventLog"("projectId", "userId", "eventType", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardConfig_tenantId_role_eventType_key" ON "LeaderboardConfig"("tenantId", "role", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardConfigSnapshot_tenantId_role_eventType_month_yea_key" ON "LeaderboardConfigSnapshot"("tenantId", "role", "eventType", "month", "year");
