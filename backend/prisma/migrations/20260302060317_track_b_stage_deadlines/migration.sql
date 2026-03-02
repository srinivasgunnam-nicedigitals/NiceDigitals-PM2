-- CreateEnum
CREATE TYPE "DelayResponsibility" AS ENUM ('INTERNAL', 'CLIENT', 'EXTERNAL');

-- AlterEnum
ALTER TYPE "ProjectStage" ADD VALUE 'OVERALL';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "approvalDeadline" TIMESTAMP(3),
ADD COLUMN     "clientReviewDeadline" TIMESTAMP(3),
ADD COLUMN     "clientUatDeadline" TIMESTAMP(3),
ADD COLUMN     "deploymentDeadline" TIMESTAMP(3),
ADD COLUMN     "designDeadline" TIMESTAMP(3),
ADD COLUMN     "developmentDeadline" TIMESTAMP(3),
ADD COLUMN     "internalQaDeadline" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StageDeadlineRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL,
    "previousDeadline" TIMESTAMP(3),
    "newDeadline" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "delayResponsibility" "DelayResponsibility" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageDeadlineRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageSchedulingConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "designRatio" INTEGER NOT NULL,
    "developmentRatio" INTEGER NOT NULL,
    "qaRatio" INTEGER NOT NULL,
    "approvalRatio" INTEGER NOT NULL,
    "overlapPercent" INTEGER NOT NULL,
    "autoAllocate" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageSchedulingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageDeadlineRevision_tenantId_idx" ON "StageDeadlineRevision"("tenantId");

-- CreateIndex
CREATE INDEX "StageDeadlineRevision_projectId_idx" ON "StageDeadlineRevision"("projectId");

-- CreateIndex
CREATE INDEX "StageDeadlineRevision_stage_idx" ON "StageDeadlineRevision"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "StageSchedulingConfig_tenantId_key" ON "StageSchedulingConfig"("tenantId");

-- CreateIndex
CREATE INDEX "StageSchedulingConfig_tenantId_idx" ON "StageSchedulingConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "StageDeadlineRevision" ADD CONSTRAINT "StageDeadlineRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageDeadlineRevision" ADD CONSTRAINT "StageDeadlineRevision_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageDeadlineRevision" ADD CONSTRAINT "StageDeadlineRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageSchedulingConfig" ADD CONSTRAINT "StageSchedulingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
