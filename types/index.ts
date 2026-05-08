import { Timestamp } from "firebase/firestore";

export type UserRole = "employee" | "admin" | "executive";

export interface User {
  uid: string;
  email: string;
  teamName: string;
  role: UserRole;
  xp: number;
  badges: string[];
  memberNames: string[];
  createdAt: Timestamp;
}

export type QuestStatus = "draft" | "active" | "closed";

export interface Quest {
  id: string;
  title: string;
  description: string;
  requirements: string;
  xpReward: number;
  badgeReward: string | null;
  status: QuestStatus;
  deadline: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
}

export type SubmissionStatus = "pending" | "approved" | "returned";

export interface Submission {
  id: string;
  questId: string;
  teamId: string;
  teamName: string;
  driveFileUrl: string;
  driveFileId: string;
  fileName: string;
  status: SubmissionStatus;
  feedback: string | null;
  xpAwarded: number | null;
  badgeAwarded: string | null;
  submittedAt: Timestamp;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  createdAt: Timestamp;
}
