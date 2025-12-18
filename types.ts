
export enum TaskStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold',
  BLOCKED = 'Blocked'
}

export enum RAGStatus {
  GREEN = 'Green',
  AMBER = 'Amber',
  RED = 'Red',
  GRAY = 'Gray'
}

export enum DependencyType {
  FS = 'Finish-to-Start',
  SS = 'Start-to-Start',
  FF = 'Finish-to-Finish',
  SF = 'Start-to-Finish'
}

export enum ZoomLevel {
  DAYS = 'Days',
  WEEKS = 'Weeks',
  MONTHS = 'Months'
}

export interface Dependency {
  predecessorId: string;
  type: DependencyType;
  lagDays: number;
}

export interface Task {
  id: string;
  parentId: string | null;
  name: string;
  startDate: string; // ISO format: YYYY-MM-DD
  endDate: string;   // ISO format: YYYY-MM-DD
  duration: number;  // days
  progress: number;  // 0-100
  status: TaskStatus;
  rag: RAGStatus;
  owner: string;
  role: string;
  dependencies: Dependency[];
  isMilestone: boolean;
  baselineStart?: string;
  baselineEnd?: string;
  isExpanded?: boolean;
  isCritical?: boolean;
  isAtRisk?: boolean; // New manual risk flag
  jiraId?: string;
  jiraType?: 'PF' | 'EPIC' | 'STORY' | 'TASK';
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  atRiskTasks: number;
  averageProgress: number;
  criticalPath: string[];
}
