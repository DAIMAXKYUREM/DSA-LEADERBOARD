export type Platform = "leetcode" | "codeforces" | "codechef" | "cses";

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  handles: Record<Platform, string>;
  stats: Record<Platform, number>;
  tokens?: {
    cses?: string;
  };
  details?: Partial<Record<Platform, any>>;
  totalSolved: number;
  history?: Record<string, number>;
  lastSyncedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface DailyStat {
  uid: string;
  date: string;
  solvedToday: number;
  totalSolved: number;
  displayName: string;
  photoURL: string;
  updatedAt: number;
}

export type TaskType = "overall" | "platform";
export type TaskStatus = "active" | "completed" | "expired";

export interface Task {
  id?: string;
  uid: string;
  title: string;
  type: TaskType;
  targetDays: number;
  startDate: string;
  endDate: string;
  targetTotal?: number;
  targetPlatforms?: Record<Platform, number>;
  startState: {
    totalSolved: number;
    leetcode: number;
    codeforces: number;
    codechef: number;
    cses: number;
  };
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}
