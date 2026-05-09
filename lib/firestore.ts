import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User, UserRole, Quest, QuestStatus, Submission, SubmissionStatus } from "@/types";

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export async function createUser(uid: string, email: string): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    teamName: email.split("@")[0],
    role: "employee",
    xp: 0,
    badges: [],
    memberNames: [],
    airport: "",
    profileImageUrl: "",
    onboardingComplete: false,
    createdAt: serverTimestamp(),
  });
  updatePublicStats().catch(console.error);
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data as Record<string, unknown>);
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as User);
}

export interface LeaderboardEntry {
  uid: string;
  teamName: string;
  airport: string;
  xp: number;
  badges: string[];
  profileImageUrl: string;
  completedQuests: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [usersSnap, subsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "employee"))),
    getDocs(query(collection(db, "submissions"), where("status", "==", "approved"))),
  ]);

  const completedByTeam = new Map<string, number>();
  subsSnap.docs.forEach((d) => {
    const teamId = d.data().teamId as string;
    completedByTeam.set(teamId, (completedByTeam.get(teamId) ?? 0) + 1);
  });

  return usersSnap.docs
    .map((d) => {
      const data = d.data();
      const uid = data.uid ?? d.id;
      return {
        uid,
        teamName: data.teamName ?? "",
        airport: data.airport ?? "",
        xp: data.xp ?? 0,
        badges: data.badges ?? [],
        profileImageUrl: data.profileImageUrl ?? "",
        completedQuests: completedByTeam.get(uid) ?? 0,
      };
    })
    .sort((a, b) => b.xp - a.xp);
}

export interface UserPublicProfile {
  teamName: string;
  profileImageUrl: string;
  airport: string;
}

export async function getUserPublicProfile(uid: string): Promise<UserPublicProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    teamName: d.teamName ?? "",
    profileImageUrl: d.profileImageUrl ?? "",
    airport: d.airport ?? "",
  };
}

export async function getUserPublicProfiles(uids: string[]): Promise<Map<string, UserPublicProfile>> {
  const unique = [...new Set(uids.filter(Boolean))];
  const results = await Promise.all(unique.map((uid) => getUserPublicProfile(uid)));
  const map = new Map<string, UserPublicProfile>();
  unique.forEach((uid, i) => {
    if (results[i]) map.set(uid, results[i]!);
  });
  return map;
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function getSubmissionStats(): Promise<{ pending: number; approved: number; returned: number }> {
  const snap = await getDocs(collection(db, "submissions"));
  const counts = { pending: 0, approved: 0, returned: 0 };
  snap.docs.forEach((d) => {
    const status = d.data().status as keyof typeof counts;
    if (status in counts) counts[status]++;
  });
  return counts;
}

export async function getTotalXP(): Promise<number> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.reduce((sum, d) => sum + ((d.data().xp as number) || 0), 0);
}

export async function getActiveQuestCount(): Promise<number> {
  const snap = await getDocs(query(collection(db, "quests"), where("status", "==", "active")));
  return snap.size;
}

// ── Quest helpers ──

export async function createQuest(data: Omit<Quest, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "quests"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  if (data.status === "active") updatePublicStats().catch(console.error);
  return ref.id;
}

export async function updateQuestStatus(id: string, status: QuestStatus): Promise<void> {
  await updateDoc(doc(db, "quests", id), { status });
  updatePublicStats().catch(console.error);
}

export async function updateQuest(id: string, data: Partial<Omit<Quest, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "quests", id), data as Record<string, unknown>);
}

export async function deleteQuest(id: string): Promise<void> {
  const subsSnap = await getDocs(query(collection(db, "submissions"), where("questId", "==", id)));
  if (!subsSnap.empty) {
    const batch = writeBatch(db);
    subsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "quests", id));
}

export async function getQuests(status?: QuestStatus): Promise<Quest[]> {
  // When filtering by status, skip orderBy to avoid requiring a composite index.
  // Sort client-side instead.
  const q = status
    ? query(collection(db, "quests"), where("status", "==", status))
    : query(collection(db, "quests"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quest));
  if (status) {
    docs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }
  return docs;
}

export async function getQuest(id: string): Promise<Quest | null> {
  const snap = await getDoc(doc(db, "quests", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Quest;
}

// ── Submission helpers ──

export async function getSubmissionsByTeam(teamId: string): Promise<Submission[]> {
  const snap = await getDocs(query(collection(db, "submissions"), where("teamId", "==", teamId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getSubmissionsByQuest(questId: string): Promise<Submission[]> {
  const snap = await getDocs(query(collection(db, "submissions"), where("questId", "==", questId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function createSubmission(data: Omit<Submission, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "submissions"), data);
  return ref.id;
}

export async function updateSubmission(id: string, data: Partial<Submission>): Promise<void> {
  await updateDoc(doc(db, "submissions", id), data as Record<string, unknown>);
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const snap = await getDocs(
    query(collection(db, "submissions"), where("status", "==", "pending"), orderBy("submittedAt", "asc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const snap = await getDocs(query(collection(db, "submissions"), orderBy("submittedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function awardSubmission(
  submissionId: string,
  teamId: string,
  xpAwarded: number,
  badgeAwarded: string | null,
  reviewedBy: string,
  reviewedByName: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "submissions", submissionId), {
    status: "approved" as SubmissionStatus,
    xpAwarded,
    badgeAwarded,
    reviewedBy,
    reviewedByName,
    reviewedAt: serverTimestamp(),
  });
  const userUpdate: Record<string, unknown> = { xp: increment(xpAwarded) };
  if (badgeAwarded) userUpdate.badges = arrayUnion(badgeAwarded);
  batch.update(doc(db, "users", teamId), userUpdate);
  await batch.commit();
  updatePublicStats().catch(console.error);
}

export async function returnSubmission(
  submissionId: string,
  feedback: string,
  reviewedBy: string,
  reviewedByName: string,
): Promise<void> {
  await updateDoc(doc(db, "submissions", submissionId), {
    status: "returned" as SubmissionStatus,
    feedback,
    reviewedBy,
    reviewedByName,
    reviewedAt: serverTimestamp(),
  });
}

export async function updateSubmissionReward(
  submissionId: string,
  data: { rewardStatus: "pending" | "delivered"; rewardNote: string | null },
): Promise<void> {
  await updateDoc(doc(db, "submissions", submissionId), data as Record<string, unknown>);
}

export interface ArchiveEntry {
  submission: Submission;
  questTitle: string;
  questThumbnailUrl: string | null;
  teamAirport: string;
  teamProfileImageUrl: string;
}

export async function getArchivedSubmissions(): Promise<Submission[]> {
  const snap = await getDocs(
    query(collection(db, "submissions"), where("status", "==", "approved")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getArchiveWithQuestData(): Promise<ArchiveEntry[]> {
  const subs = await getArchivedSubmissions();
  if (subs.length === 0) return [];

  const questIds = [...new Set(subs.map((s) => s.questId))];
  const teamIds = [...new Set(subs.map((s) => s.teamId))];

  const [quests, profiles] = await Promise.all([
    Promise.all(questIds.map((id) => getQuest(id))),
    Promise.all(teamIds.map((id) => getUserPublicProfile(id))),
  ]);

  const questMap = new Map(questIds.map((id, i) => [id, quests[i]]));
  const profileMap = new Map(teamIds.map((id, i) => [id, profiles[i]]));

  return subs
    .filter((sub) => questMap.get(sub.questId) != null)
    .map((sub) => ({
      submission: sub,
      questTitle: questMap.get(sub.questId)!.title,
      questThumbnailUrl: questMap.get(sub.questId)!.thumbnailUrl ?? null,
      teamAirport: profileMap.get(sub.teamId)?.airport ?? "",
      teamProfileImageUrl: profileMap.get(sub.teamId)?.profileImageUrl ?? "",
    }))
    .sort((a, b) => {
      const at = a.submission.reviewedAt?.toMillis() ?? 0;
      const bt = b.submission.reviewedAt?.toMillis() ?? 0;
      return bt - at;
    });
}

export async function getHomePageData(uid: string): Promise<{
  quests: Quest[];
  submissions: Submission[];
  leaderboard: LeaderboardEntry[];
}> {
  const [quests, submissions, leaderboard] = await Promise.all([
    getQuests("active"),
    getSubmissionsByTeam(uid),
    getLeaderboard(),
  ]);
  return { quests, submissions, leaderboard };
}

export interface PublicStats {
  totalTeams: number;
  totalQuests: number;
  totalXP: number;
  totalAirports: number;
}

export async function getPublicStats(): Promise<PublicStats> {
  const snap = await getDoc(doc(db, "stats", "public"));
  if (!snap.exists()) return { totalTeams: 0, totalQuests: 0, totalXP: 0, totalAirports: 0 };
  const data = snap.data();
  return {
    totalTeams: data.totalTeams ?? 0,
    totalQuests: data.totalQuests ?? 0,
    totalXP: data.totalXP ?? 0,
    totalAirports: data.totalAirports ?? 0,
  };
}

export async function updatePublicStats(): Promise<void> {
  const [usersSnap, questsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "in", ["employee", "admin"]))),
    getDocs(query(collection(db, "quests"), where("status", "==", "active"))),
  ]);
  const airports = new Set<string>();
  let totalXP = 0;
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    totalXP += (data.xp as number) ?? 0;
    if (data.airport) airports.add(data.airport as string);
  });
  await setDoc(doc(db, "stats", "public"), {
    totalTeams: usersSnap.size,
    totalQuests: questsSnap.size,
    totalXP,
    totalAirports: airports.size,
    updatedAt: serverTimestamp(),
  });
}
