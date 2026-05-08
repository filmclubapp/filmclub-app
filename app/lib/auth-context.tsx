"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase, type Profile } from "./supabase";
import { ensureProfile } from "./hooks";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  function mapAuthError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("failed to fetch") || message.includes("network")) {
        return "Can't reach Film Club right now. Check your connection, disable VPN/ad blockers, and try again.";
      }
      return error.message;
    }
    return "Something went wrong. Please try again.";
  }

  function validateSupabaseConfig(): string | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return "Missing Supabase configuration. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.";
    }
    return null;
  }

  /* --- load profile helper (auto-creates if missing) --- */
  async function loadProfile(userId: string) {
    try {
      let { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // If no profile row exists, create one so FK constraints never break
      if (!data) {
        await ensureProfile(userId);
        const res = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        data = res.data;
      }

      setProfile(data);
    } catch {
      // Keep auth state usable even if profile fetch fails.
      setProfile(null);
    }
  }

  /* --- bootstrap session --- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- sign up (creates auth user + profile row) --- */
  async function signUp(email: string, password: string, username: string) {
    const configError = validateSupabaseConfig();
    if (configError) return { error: configError };

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });
      const body = await res.json();
      if (!res.ok) return { error: body?.error || "Sign up failed." };

      if (body?.access_token && body?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: body.access_token as string,
          refresh_token: body.refresh_token as string,
        });
        if (sessionError) return { error: sessionError.message };
      }

      // Insert profile row after auth account creation.
      if (body?.user?.id) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: body.user.id as string,
          username,
          display_name: username,
        });
        if (profileError) {
          return {
            error:
              "Account created, but we couldn't create your Film Club ID yet. Please sign in and try again.",
          };
        }
        await loadProfile(body.user.id as string);
      }
      return { error: null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  }

  /* --- sign in --- */
  async function signIn(email: string, password: string) {
    const configError = validateSupabaseConfig();
    if (configError) return { error: configError };

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) return { error: body?.error || "Sign in failed." };

      if (!body?.access_token || !body?.refresh_token) {
        return { error: "Sign in failed. Missing session tokens." };
      }

      const { error } = await supabase.auth.setSession({
        access_token: body.access_token as string,
        refresh_token: body.refresh_token as string,
      });
      if (error) return { error: error.message };

      return { error: null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  }

  /* --- sign out --- */
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
