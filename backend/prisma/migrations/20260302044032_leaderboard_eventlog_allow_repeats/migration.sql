-- DropIndex
DROP INDEX "LeaderboardEventLog_projectId_userId_eventType_month_year_key";

-- CreateIndex
CREATE INDEX "LeaderboardEventLog_projectId_userId_eventType_month_year_idx" ON "LeaderboardEventLog"("projectId", "userId", "eventType", "month", "year");
