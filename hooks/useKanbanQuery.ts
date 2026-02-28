/**
 * useKanbanQuery.ts
 *
 * Fetches the Kanban board data from the dedicated /api/projects/kanban endpoint.
 *
 * Design principles:
 *  - This hook is SEPARATE from useProjectsQuery — the two share NO contract
 *  - Each stage is independently capped at limitPerStage (default 20)
 *  - hasMore flag signals when a column has more projects than shown
 *  - The queryKey is 'kanban' — invalidated by WS INVALIDATE events
 *  - Non-admins get only their assigned projects (filtered server-side)
 */

import { useQuery } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';

export type KanbanStage = 'UPCOMING' | 'DESIGN' | 'DEVELOPMENT' | 'QA' | 'ADMIN_REVIEW' | 'SENT_TO_CLIENT';

export interface KanbanColumn {
    items: Project[];
    total: number;   // True total in this stage (for column header badge)
    hasMore: boolean; // True when more items exist beyond limitPerStage
}

export type KanbanBoard = Partial<Record<KanbanStage, KanbanColumn>>;

const ORDERED_STAGES: KanbanStage[] = [
    'UPCOMING', 'DESIGN', 'DEVELOPMENT', 'QA', 'ADMIN_REVIEW', 'SENT_TO_CLIENT'
];

const EMPTY_BOARD: KanbanBoard = ORDERED_STAGES.reduce((acc, stage) => {
    acc[stage] = { items: [], total: 0, hasMore: false };
    return acc;
}, {} as KanbanBoard);

export { ORDERED_STAGES };

export function useKanbanQuery(limitPerStage = 20) {
    const { currentUser, isAuthenticating } = useAuth();

    const query = useQuery<KanbanBoard>({
        queryKey: ['kanban', { limitPerStage }],
        queryFn: () => backendApi.getKanban(limitPerStage),
        enabled: !!currentUser && !isAuthenticating,
        // Keep showing prev board while a new fetch is in progress
        placeholderData: (prev) => prev,
        // Stale after 30s — WS invalidation handles real-time updates
        staleTime: 30_000,
    });

    return {
        ...query,
        board: query.data ?? EMPTY_BOARD,
        // Convenience: ordered array of [stage, column] tuples for rendering
        columns: ORDERED_STAGES.map(stage => ({
            stage,
            column: (query.data ?? EMPTY_BOARD)[stage] ?? { items: [], total: 0, hasMore: false },
        })),
    };
}
