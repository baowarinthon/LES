import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserRole } from "@/types";

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithRedirect(auth, googleProvider);
}

export { getRedirectResult, auth };

export function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data().role as UserRole;
}
