import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "@/types";

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
    createdAt: serverTimestamp(),
  });
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data as Record<string, unknown>);
}
