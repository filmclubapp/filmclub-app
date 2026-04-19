"use client";

/* ============================================================
   FILM CLUB — AUTH
   Sign in / Sign up. Cinematic. Minimal. One screen.
   ============================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

const BG = "#0E0D18";
const SURFACE = "#17162A";
const INK = "#F4EFD8";
const MUTED = "#8B88A6";
const RED = "#FF4A4A";

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) {
          setError("Pick a username.");
          setLoading(false);
          return;
        }
        if (username.length < 3) {
          setError("Username needs at least 3 characters.");
          setLoading(false);
          return;
        }
        const { error: err } = await signUp(email, password, username.trim());
        if (err) {
          setError(err);
          setLoading(false);
          return;
        }
      } else {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      // New signups go to onboarding, returning users go home
      router.push(mode === "signup" ? "/onboarding" : "/home");
    } catch {
      setLoading(false);
      setError(
        "Couldn't connect right now. Check your internet or VPN/ad-block settings and try again.",
      );
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: BG }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1
          className="font-anton text-5xl tracking-tight"
          style={{ color: INK }}
        >
          FILM<span style={{ color: RED }}>CLUB</span>
        </h1>
        <p className="font-mono text-xs mt-2 tracking-widest" style={{ color: MUTED }}>
          THE SOCIAL HOME OF FILM
        </p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: SURFACE }}
      >
        {/* Mode toggle */}
        <div
          className="flex rounded-xl overflow-hidden mb-6"
          style={{ background: BG }}
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-3 font-mono text-xs tracking-widest transition-all duration-200"
              style={{
                color: mode === m ? BG : MUTED,
                background: mode === m ? RED : "transparent",
                fontWeight: mode === m ? 700 : 400,
              }}
            >
              {m === "signin" ? "SIGN IN" : "JOIN"}
            </button>
          ))}
        </div>

        {/* Username (signup only) */}
        {mode === "signup" && (
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={20}
            className="w-full rounded-xl px-4 py-3 mb-3 font-mono text-sm outline-none transition-all duration-200 focus:ring-2"
            style={{
              background: BG,
              color: INK,
              borderColor: "transparent",
              // @ts-expect-error ring color
              "--tw-ring-color": RED,
            }}
          />
        )}

        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 mb-3 font-mono text-sm outline-none transition-all duration-200 focus:ring-2"
          style={{
            background: BG,
            color: INK,
            // @ts-expect-error ring color
            "--tw-ring-color": RED,
          }}
        />

        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl px-4 py-3 mb-4 font-mono text-sm outline-none transition-all duration-200 focus:ring-2"
          style={{
            background: BG,
            color: INK,
            // @ts-expect-error ring color
            "--tw-ring-color": RED,
          }}
        />

        {/* Error */}
        {error && (
          <p className="text-xs font-mono mb-3 px-1" style={{ color: RED }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3.5 font-mono text-sm tracking-widest font-bold transition-all duration-200 active:scale-[0.97]"
          style={{
            background: RED,
            color: BG,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? "..."
            : mode === "signin"
            ? "ENTER"
            : "CREATE ACCOUNT"}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-8 font-mono text-[10px] tracking-wider" style={{ color: MUTED }}>
        FOR PEOPLE WHO FEEL THINGS WATCHING FILMS
      </p>
    </div>
  );
}
