import { Request, Response } from 'express';
import { RankingService } from '../services/ranking.service';

export const getRankings = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const rankings = await RankingService.getDevRankings(tenantId);
        res.json(rankings);
    } catch (error) {
        console.error('Get Rankings Error:', error);
        res.status(500).json({ error: 'Failed to fetch rankings' });
    }
};
