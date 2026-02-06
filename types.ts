
export enum UserRole {
  ADMIN = 'ADMIN',
  DESIGNER = 'DESIGNER',
  DEV_MANAGER = 'DEV_MANAGER',
  QA_ENGINEER = 'QA_ENGINEER'
}

export enum ProjectStage {
  UPCOMING = 'UPCOMING',
  DESIGN = 'DESIGN',
  DEVELOPMENT = 'DEVELOPMENT',
  QA = 'QA',
  ADMIN_REVIEW = 'ADMIN_REVIEW',
  COMPLETED = 'COMPLETED'
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
  timestamp: string;
  userId: string;
  action: string;
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

  comments?: Comment[];

  isDelayed: boolean;
  qaFailCount: number;

  history?: HistoryItem[];

  createdAt: string;
  completedAt?: string;
}

export interface DevPerformance {
  userId: string;
  userName: string;
  totalPoints: number;
  monthlyPoints: number;
  completedProjects: number;
  qaFailureRate: number;
  onTimeDeliveryRate: number;
}
