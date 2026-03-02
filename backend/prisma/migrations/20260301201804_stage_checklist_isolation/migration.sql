-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "clientReviewChecklist" JSONB[],
ADD COLUMN     "clientUatChecklist" JSONB[],
ADD COLUMN     "deploymentChecklist" JSONB[];
