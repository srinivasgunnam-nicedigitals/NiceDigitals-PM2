import { Request, Response, NextFunction } from 'express';
import {
    getLatestTwoSnapshots,
    getTeamSnapshots,
    computeUserDiscipline
} from '../services/discipline.service';
import { triggerDisciplineComputation } from '../services/discipline-cron.service';

// GET /api/discipline/me — User's own latest + previous snapshot (for trend)
export const getMyDiscipline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;

        if (!tenantId || !userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const snapshots = await getLatestTwoSnapshots(tenantId, userId);
        const latest = snapshots[0] || null;
        const previous = snapshots[1] || null;

        res.json({ latest, previous });
    } catch (error) {
        next(error);
    }
};

// GET /api/discipline/users/:userId — Admin view of any user's latest + previous
export const getUserDiscipline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

        const { userId } = req.params;
        const snapshots = await getLatestTwoSnapshots(tenantId, userId);
        const latest = snapshots[0] || null;
        const previous = snapshots[1] || null;

        res.json({ latest, previous });
    } catch (error) {
        next(error);
    }
};

// GET /api/discipline/team — Admin overview of all users' latest snapshots
export const getTeamDiscipline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

        const team = await getTeamSnapshots(tenantId);
        res.json(team);
    } catch (error) {
        next(error);
    }
};

// GET /api/discipline/debug/:userId — Admin only: raw intermediate computation
export const getDebugDiscipline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

        const { userId } = req.params;
        const result = await computeUserDiscipline(tenantId, userId);

        res.json({
            computed: result,
            explanation: {
                qaDomainScore: `QA stability: ${result.qaFirstPassCount} passes, ${result.qaRejectCount} rejects → score ${result.qaDomainScore.toFixed(2)}`,
                reworkDomainScore: `Rework: ${result.revertCount} reverts (${result.highSevRevertCount} high-sev), tenant avg ${result.tenantAvgReverts.toFixed(2)} → score ${result.reworkDomainScore.toFixed(2)}`,
                checklistDomainScore: `Checklist: avg completion rate ${(result.checklistAvgRate * 100).toFixed(1)}% → score ${result.checklistDomainScore.toFixed(2)}`,
                deadlineDomainScore: `Deadline: on-time rate ${(result.onTimeRate * 100).toFixed(1)}%, avg delay ${result.avgDelayDays.toFixed(1)} days → score ${result.deadlineDomainScore.toFixed(2)}`,
                velocityDomainScore: `Velocity: user avg ${result.avgStageDays.toFixed(1)} days vs tenant median ${result.tenantAvgStageDays.toFixed(1)} days → score ${result.velocityDomainScore.toFixed(2)}`,
                finalIndex: `DisciplineIndex: (${result.qaDomainScore.toFixed(2)} + ${result.reworkDomainScore.toFixed(2)} + ${result.checklistDomainScore.toFixed(2)} + ${result.deadlineDomainScore.toFixed(2)} + ${result.velocityDomainScore.toFixed(2)}) / 5 → normalized to ${result.disciplineIndex.toFixed(1)}`
            }
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/discipline/trigger — Admin only: manually trigger cron computation
export const triggerComputation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await triggerDisciplineComputation();
        res.json({ message: 'Discipline computation completed', results });
    } catch (error) {
        next(error);
    }
};
