"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, onAuthStateChanged } from "./auth";
import { getUser, createUser, getQuests, getLeaderboard, type LeaderboardEntry } from "./firestore";
import type { User, UserRole, Quest } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  authError: string | null;
  refreshUser: () => Promise<void>;
  quests: Quest[] | null;
  leaderboard: LeaderboardEntry[] | null;
  fetchQuests: () => Promise<Quest[]>;
  fetchLeaderboard: () => Promise<LeaderboardEntry[]>;
  refreshQuests: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  role: null,
  loading: true,
  authError: null,
  refreshUser: async () => {},
  quests: null,
  leaderboard: null,
  fetchQuests: async () => [],
  fetchLeaderboard: async () => [],
  refreshQuests: async () => {},
  refreshLeaderboard: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  // Inflight de-dupe refs
  const questsPromise = useRef<Promise<Quest[]> | null>(null);
  const leaderboardPromise = useRef<Promise<LeaderboardEntry[]> | null>(null);

  async function refreshUser() {
    const fbUser = firebaseUser;
    if (!fbUser) return;
    const firestoreUser = await getUser(fbUser.uid);
    setUser(firestoreUser);
    setRole(firestoreUser?.role ?? null);
  }

  async function fetchQuests(): Promise<Quest[]> {
    if (quests !== null) return quests;
    if (!questsPromise.current) {
      questsPromise.current = getQuests("active").then((qs) => {
        setQuests(qs);
        questsPromise.current = null;
        return qs;
      });
    }
    return questsPromise.current;
  }

  async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    if (leaderboard !== null) return leaderboard;
    if (!leaderboardPromise.current) {
      leaderboardPromise.current = getLeaderboard().then((lb) => {
        setLeaderboard(lb);
        leaderboardPromise.current = null;
        return lb;
      });
    }
    return leaderboardPromise.current;
  }

  async function refreshQuests(): Promise<void> {
    setQuests(null);
    questsPromise.current = null;
    const qs = await getQuests("active");
    setQuests(qs);
  }

  async function refreshLeaderboard(): Promise<void> {
    setLeaderboard(null);
    leaderboardPromise.current = null;
    const lb = await getLeaderboard();
    setLeaderboard(lb);
  }

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    async function init() {
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
          setQuests(null);
          setLeaderboard(null);
        }

        setLoading(false);
      });
    }

    init();

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      firebaseUser, user, role, loading, authError, refreshUser,
      quests, leaderboard, fetchQuests, fetchLeaderboard, refreshQuests, refreshLeaderboard,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
