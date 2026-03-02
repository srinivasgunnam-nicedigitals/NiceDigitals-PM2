
export enum UserRole {
  ADMIN = 'ADMIN',
  DESIGNER = 'DESIGNER',
  DEV_MANAGER = 'DEV_MANAGER',
  QA_ENGINEER = 'QA_ENGINEER'
}

export enum ProjectStage {
  DISCOVERY = 'DISCOVERY',
  DESIGN = 'DESIGN',
  CLIENT_REVIEW = 'CLIENT_REVIEW',
  DEVELOPMENT = 'DEVELOPMENT',
  INTERNAL_QA = 'INTERNAL_QA',
  INTERNAL_APPROVAL = 'INTERNAL_APPROVAL',
  CLIENT_UAT = 'CLIENT_UAT',
  DEPLOYMENT = 'DEPLOYMENT',
  COMPLETED = 'COMPLETED'
}

export enum RevertReasonCategory {
  DESIGN_CLARIFICATION = 'DESIGN_CLARIFICATION',
  DEV_IMPLEMENTATION_BUG = 'DEV_IMPLEMENTATION_BUG',
  QA_MISS = 'QA_MISS',
  CLIENT_CHANGE_REQUEST = 'CLIENT_CHANGE_REQUEST',
  SCOPE_EXPANSION = 'SCOPE_EXPANSION',
  PERFORMANCE_ISSUE = 'PERFORMANCE_ISSUE',
  CONTENT_MISSING = 'CONTENT_MISSING',
  OTHER = 'OTHER'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string; // New password field
  role: UserRole;
  avatar?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ChecklistTemplateItem {
  id?: string;
  label: string;
  required?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  tenantId: string;
  stage: ProjectStage;
  name: string;
  description?: string;
  isDefault: boolean;
  version: number;
  isArchived: boolean;
  items: ChecklistTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface ScoreEntry {
  projectId: string;
  date: string;
  points: number;
  reason: string;
}

export interface HistoryItem {
  stage: ProjectStage;
  toStage?: ProjectStage;
  timestamp: string;
  userId: string;
  performedByRole?: UserRole;
  action: string;
  revertReasonCategory?: RevertReasonCategory;
  revertReasonNote?: string;
  rejectionSnapshot?: ChecklistItem[];
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  scope: string;
  priority: Priority;
  stage: ProjectStage;
  overallDeadline: string;
  currentDeadline?: string;

  assignedDesignerId?: string;
  assignedDevManagerId?: string;
  assignedQAId?: string;

  designChecklist: ChecklistItem[];
  devChecklist: ChecklistItem[];
  qaChecklist: ChecklistItem[];
  finalChecklist: ChecklistItem[];

  clientReviewChecklist: ChecklistItem[];
  clientUatChecklist: ChecklistItem[];
  deploymentChecklist: ChecklistItem[];

  comments?: Comment[];

  isDelayed: boolean;
  qaFailCount: number;

  history?: HistoryItem[];

  createdAt: string;
  enteredStageAt?: string;
  completedAt?: string;

  // Version control for optimistic locking
  version: number;
  updatedAt: string;
}

export interface DevPerformance {
  userId: string;
  userName: string;
  totalPoints: number;
  monthlyPoints: number;
  completedProjects: number;
  qaFirstTimeRightRate: number | null; // null = no QA data yet (never showed 100% falsely)
  onTimeDeliveryRate: number | null;   // null = no completed projects yet
  hasData: boolean;                    // false = zero assigned projects
}

// Phase 2A: Team member types
export enum TeamLeadRole {
  DESIGN = 'DESIGN',
  DEV = 'DEV',
  QA = 'QA'
}

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  tenantId: string;
  leadRole: TeamLeadRole;
  name: string;
  roleTitle: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineSnapshot {
  id: string;
  tenantId: string;
  userId: string;
  snapshotDate: string;
  disciplineIndex: number;

  qaDomainScore: number;
  reworkDomainScore: number;
  checklistDomainScore: number;
  deadlineDomainScore: number;
  velocityDomainScore: number;

  qaFirstPassCount: number;
  qaRejectCount: number;
  revertCount: number;
  highSevRevertCount: number;
  checklistAvgRate: number;
  onTimeRate: number;
  avgDelayDays: number;
  avgStageDays: number;
  tenantAvgStageDays: number;
  tenantAvgReverts: number;

  createdAt: string;
}

export interface ExecutionHealth {
  executionHealth: number;
  deliveryConfidence: number;
  atRisk: boolean;
  breakdown: {
    deadlinePressure: number;
    reworkInstability: number;
    checklistPenalty: number;
    stageDeviation: number;
    disciplineModifier: number;
  };
}

export interface CalibrationProject {
  id: string;
  name: string;
  clientName: string;
  completedAt: string;
  overallDeadline: string;
  healthAtCompletion: number | null;
  actualOutcome: 'ON_TIME' | 'DELAYED' | 'ESCALATED' | null;
  assignedDevManager: { id: string; name: string } | null;
}

export interface CalibrationReport {
  projects: CalibrationProject[];
  stats: {
    totalCompleted: number;
    withHealthData: number;
    withOutcome: number;
    calibrated: number;
    accuracy: number | null;
  };
}
