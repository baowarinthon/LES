import { Timestamp } from "firebase/firestore";

export type UserRole = "employee" | "admin" | "executive" | "super_admin";

export type UserStatus = "pending" | "approved" | "rejected";

export interface User {
  uid: string;
  email: string;
  teamName: string;
  role: UserRole;
  status: UserStatus;
  xp: number;
  badges: string[];
  memberNames: string[];
  airport?: string;
  profileImageUrl?: string;
  onboardingComplete?: boolean;
  createdAt: Timestamp;
}

export type QuestStatus = "draft" | "active" | "closed";

export type RewardType = "digital" | "physical" | "recognition";

export interface Quest {
  id: string;
  title: string;
  description: string;
  requirements: string;
  xpReward: number;
  badgeReward: string | null;
  thumbnailUrl: string | null;
  driveFileId: string | null;
  driveFileUrl: string | null;
  status: QuestStatus;
  deadline: Timestamp | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  rewardType?: RewardType | null;
  rewardTitle?: string | null;
  rewardDescription?: string | null;
  rewardImageUrl?: string | null;
  driveFolderId?: string | null;
  driveFolderUrl?: string | null;
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
  reviewedByName: string | null;
  questTitle?: string;
  rewardStatus?: "pending" | "delivered" | null;
  rewardNote?: string | null;
  driveWebViewLink?: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  createdAt: Timestamp;
}
