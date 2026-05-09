"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, getRedirectResult, onAuthStateChanged } from "./auth";
import { getUser, createUser } from "./firestore";
import type { User, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  role: null,
  loading: true,
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    async function init() {
      // Process any pending redirect sign-in result first
      try {
        await getRedirectResult(auth);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Auth] Redirect result error:", msg);
        setAuthError(msg);
        setLoading(false);
      }

      // Subscribe to auth state changes
      unsubscribe = onAuthStateChanged(async (fbUser) => {
        setFirebaseUser(fbUser);
        setAuthError(null);

        if (fbUser) {
          try {
            let firestoreUser = await getUser(fbUser.uid);
            if (!firestoreUser) {
              await createUser(fbUser.uid, fbUser.email ?? "");
              firestoreUser = await getUser(fbUser.uid);
            }
            setUser(firestoreUser);
            setRole(firestoreUser?.role ?? null);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[Auth] Firestore user fetch error:", msg);
            setAuthError(msg);
          }
        } else {
          setUser(null);
          setRole(null);
        }

        setLoading(false);
      });
    }

    init();

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, user, role, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
