import { prisma } from '../config/db';
import { differenceInDays, isSameMonth } from 'date-fns';

export class RankingService {
    static async getDevRankings(tenantId: string) {
        // 1. Fetch all DEV_MANAGERs
        const devManagers = await prisma.user.findMany({
            where: {
                role: 'DEV_MANAGER',
                tenantId: tenantId
            }
        });

        const today = new Date();

        // 2. OPTIMIZED: Bulk Fetch Data (O(1) queries instead of O(N))
        const [projects, scores] = await Promise.all([
            prisma.project.findMany({
                where: {
                    tenantId: tenantId,
                    assignedDevManagerId: { in: devManagers.map(d => d.id) }
                },
                select: {
                    assignedDevManagerId: true,
                    stage: true,
                    completedAt: true,
                    overallDeadline: true,
                    qaFailCount: true
                }
            }),
            prisma.scoreEntry.findMany({
                where: {
                    tenantId: tenantId,
                    userId: { in: devManagers.map(d => d.id) }
                }
            })
        ]);

        // 3. Map in Memory
        const rankings = devManagers.map(dev => {
            const devProjects = projects.filter(p => p.assignedDevManagerId === dev.id);
            const devScores = scores.filter(s => s.userId === dev.id);

            const totalPoints = devScores.reduce((acc, s) => acc + s.points, 0);
            const monthlyPoints = devScores
                .filter(s => isSameMonth(s.date, today))
                .reduce((acc, s) => acc + s.points, 0);

            const completed = devProjects.filter(p => p.stage === 'COMPLETED');
            const monthlyCompleted = completed.filter(p => p.completedAt && isSameMonth(p.completedAt, today));
            const onTime = completed.filter(p => p.completedAt && p.completedAt <= p.overallDeadline).length;

            const qaFails = devProjects.reduce((acc, p) => acc + (p.qaFailCount || 0), 0);
             // Logic mirrored from frontend: p.stage !== DESIGN && p.stage !== DEVELOPMENT && p.stage !== UPCOMING
            const qaPasses = devProjects.filter(p => 
                p.stage !== 'DESIGN' && 
                p.stage !== 'DEVELOPMENT' && 
                p.stage !== 'UPCOMING'
            ).length;

            const totalQA = qaPasses + qaFails;
            const qaFailureRate = totalQA > 0 ? (qaFails / totalQA) * 100 : 0;
            const onTimeDeliveryRate = completed.length > 0 ? (onTime / completed.length) * 100 : 100;

             return {
                userId: dev.id,
                userName: dev.name,
                totalPoints,
                monthlyPoints,
                completedProjects: monthlyCompleted.length,
                qaFailureRate,
                onTimeDeliveryRate
            };
        });

        // 3. Sort by total points descending
        return rankings.sort((a, b) => b.totalPoints - a.totalPoints);
    }
}
