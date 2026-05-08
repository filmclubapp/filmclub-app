"use client";

import Link from "next/link";
import { PublicProfile } from "./page";

/* ── Design tokens (must match quiz/page.tsx) ── */
const BG  = "#0d0c16";
const RED = "#FF4A4A";
const DNA_AXES = ["VISUAL", "PACE", "EMOTION", "INTELLECT", "SOUL"];

const posterSrc = (path: string | null) =>
  path ? `/api/tmdb-image?path=${encodeURIComponent(path)}&size=w342` : "";

/* ── Archetypes lookup (keep in sync with quiz/page.tsx) ── */
const ARCHETYPES: Record<string, {
  name: string; tagline: string; desc: string; tags: string[];
  cardBg: string; radarAc: string; dna: number[];
}> = {
  "neon-noirist": {
    name: "NEON NOIRIST", tagline: "chases beauty in the dark",
    desc: "You see what others miss. The way light falls through a window at 2am. The pause before someone says something they can't take back. You were drawn to cinema because it's the only place that holds darkness the way you do — not as something to fix, but as something to inhabit. You don't need the film to end well. You need it to end honestly.",
    tags: ["ATMOSPHERE", "MORAL COMPLEXITY", "VISUAL TENSION"],
    cardBg: "#0e1020", radarAc: "#6470d4", dna: [9.6, 5.2, 6.8, 7.4, 8.9],
  },
  "emotional-architect": {
    name: "EMOTIONAL ARCHITECT", tagline: "builds feeling with ruthless precision",
    desc: "You experience emotion like architecture — you feel it and simultaneously understand its structure. A film breaks you and you know exactly which scene, which note, which cut did it. People watch for the story. You watch for the precise moment a human being becomes completely real on screen. You carry films in your body long after the credits roll.",
    tags: ["CHARACTER DEPTH", "EMOTIONAL TRUTH", "HUMAN DRAMA"],
    cardBg: "#140820", radarAc: "#c084fc", dna: [7.2, 6.0, 9.8, 8.4, 9.1],
  },
  "slow-burn": {
    name: "THE SLOW BURN", tagline: "lets silence do the work",
    desc: "Silence doesn't make you anxious — it makes you pay attention. You have the rarest gift in cinema: patience. While others reach for their phones, you're noticing how long the camera holds on an empty room, what that means, what it costs the character to stay in it. You understand that in the right film, nothing happening is everything happening.",
    tags: ["PATIENCE", "ATMOSPHERE", "QUIET INTENSITY"],
    cardBg: "#081420", radarAc: "#7aa2c0", dna: [8.1, 3.5, 8.6, 7.8, 9.4],
  },
  "cosmic-romantic": {
    name: "COSMIC ROMANTIC", tagline: "love on a scale that breaks you",
    desc: "You believe love is the most cinematic thing that exists — not the easy kind, but the kind that costs something. The kind that survives time, distance, death, regret. You watch films about love not to escape your life but to understand it. Every great love story you've ever seen has left a specific mark on you. You can still feel all of them.",
    tags: ["LOVE", "SCALE", "BITTERSWEET TRUTH"],
    cardBg: "#1a0814", radarAc: "#e078a0", dna: [7.6, 6.5, 9.5, 6.8, 9.7],
  },
  "concrete-realist": {
    name: "CONCRETE REALIST", tagline: "no gloss. just truth",
    desc: "You have no patience for gloss. The most powerful thing a film can do is make you forget you're watching one — when it moves exactly like life moves, messy and unresolved and true. You trust films that trust their audience enough not to explain everything. Sentiment feels like a lie to you. Earned feeling is everything.",
    tags: ["RAW TRUTH", "SOCIAL REALISM", "NO SENTIMENTALITY"],
    cardBg: "#081408", radarAc: "#70a050", dna: [6.4, 7.2, 8.8, 8.6, 7.5],
  },
  "genre-subverter": {
    name: "GENRE SUBVERTER", tagline: "watches genre to watch it break",
    desc: "You've always watched films one level above everyone else. You clock the genre signals, the expected beats — and what you love is the director who knows you're clocking them and decides to do something else entirely. You love cinema that is in conversation with itself. The setup only exists because you both know what it's for, and you're both about to break it.",
    tags: ["SUBVERSION", "WIT", "BRAVE STORYTELLING"],
    cardBg: "#1a1000", radarAc: "#f0a030", dna: [7.8, 7.5, 7.2, 9.2, 7.6],
  },
  "auteur-devotee": {
    name: "THE AUTEUR DEVOTEE", tagline: "follows the director, not the film",
    desc: "You see the director's hand in everything. The length of a shot. The placement of a body in a frame. The decision to cut here and not a second later. You've fallen into filmographies the way other people fall into relationships — completely, obsessively, with total commitment. You don't just watch films. You study them. And what you're studying is how a singular mind sees the world.",
    tags: ["CRAFT", "DIRECTORIAL VISION", "VISUAL LANGUAGE"],
    cardBg: "#080c18", radarAc: "#60a8d0", dna: [9.4, 6.8, 7.1, 9.6, 8.2],
  },
  "deadpan": {
    name: "THE DEADPAN", tagline: "warm underneath the cool",
    desc: "Warmth disguised as cool — that's you. You gravitate toward films that hold you at arm's length and then, when you least expect it, wreck you completely. You appreciate the craft of keeping a perfectly straight face while something devastating is happening. People who love the same films as you become your people immediately. The sense of humour is specific. So is the sadness underneath it.",
    tags: ["DRY WIT", "PRECISION", "WARM IRONY"],
    cardBg: "#1a1400", radarAc: "#d4a040", dna: [9.1, 5.8, 6.4, 8.8, 7.2],
  },
};

function RadarChart({ scores, accent }: { scores: number[]; accent: string }) {
  const cx = 56, cy = 56, r = 36, n = 5, size = 112;
  const pt = (i: number, rad: number): [number, number] => {
    const a = (i * 2 * Math.PI / n) - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((lv, li) => (
        <polygon key={li}
          points={Array.from({ length: n }, (_, i) => pt(i, lv * r).join(",")).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      <polygon
        points={scores.map((s, i) => pt(i, (s / 10) * r).join(",")).join(" ")}
        fill={`${accent}22`} stroke={accent} strokeWidth="1" />
      {scores.map((s, i) => {
        const [px, py] = pt(i, (s / 10) * r);
        return <circle key={i} cx={px} cy={py} r="2.5" fill={accent} />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const [lx, ly] = pt(i, r + 10);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: "5px", fill: "rgba(232,228,212,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
            {DNA_AXES[i]}
          </text>
        );
      })}
    </svg>
  );
}

export default function PublicCard({ profile }: { profile: PublicProfile }) {
  const archetype = ARCHETYPES[profile.taste_tribe];

  if (!archetype) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", color: "rgba(232,228,212,0.3)", fontSize: "12px", letterSpacing: "0.2em" }}>
          Unknown archetype
        </p>
      </div>
    );
  }

  const hasFilms = profile.top_films.some(f => f.title);

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'DM Mono', monospace" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.35em", color: RED, textTransform: "uppercase", marginBottom: "6px" }}>Film Club</div>
        <div style={{ fontSize: "11px", letterSpacing: "0.18em", color: "rgba(232,228,212,0.3)", textTransform: "uppercase" }}>
          {profile.member_number} · Founding Member
        </div>
      </div>

      {/* ID Card */}
      <div style={{
        width: "100%", maxWidth: "340px",
        background: archetype.cardBg,
        borderRadius: "14px",
        border: `1px solid ${RED}30`,
        overflow: "hidden",
        position: "relative",
        boxShadow: `0 0 60px ${archetype.radarAc}20, 0 20px 60px rgba(0,0,0,0.6)`,
      }}>
        {/* Corner marks */}
        {[["0","0","90"], ["100%","0","-90"], ["0","100%","90"], ["100%","100%","180"]].map(([x, y, r], i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 10 10" style={{ position: "absolute", left: x === "0" ? "8px" : undefined, right: x === "100%" ? "8px" : undefined, top: y === "0" ? "8px" : undefined, bottom: y === "100%" ? "8px" : undefined }}>
            <path d="M0,6 L0,0 L6,0" fill="none" stroke={RED} strokeWidth="0.7" strokeOpacity="0.6" transform={`rotate(${r},5,5)`} />
          </svg>
        ))}

        {/* Shimmer lines */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${RED}40, transparent)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${RED}20, transparent)` }} />

        <div style={{ padding: "20px 20px 18px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "26px", color: "#E8E4D4", letterSpacing: "0.04em", lineHeight: 1 }}>FILM CLUB ID</div>
            <div style={{ fontSize: "7px", letterSpacing: "0.25em", color: `${RED}cc`, textTransform: "uppercase", textAlign: "right", lineHeight: 1.6 }}>
              WAVE 01<br />FOUNDING
            </div>
          </div>

          {/* Member row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingBottom: "12px", borderBottom: `0.5px solid rgba(255,255,255,0.06)` }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: RED, letterSpacing: "0.15em" }}>{profile.member_number}</span>
            <span style={{ color: "rgba(232,228,212,0.15)", fontSize: "8px" }}>·</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#E8E4D4", letterSpacing: "0.1em" }}>{profile.username}</span>
          </div>

          {/* Archetype */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "7px", letterSpacing: "0.28em", color: "rgba(232,228,212,0.3)", textTransform: "uppercase", marginBottom: "4px" }}>Cinematic Identity</div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "18px", color: archetype.radarAc, letterSpacing: "0.04em", lineHeight: 1.1 }}>{archetype.name}</div>
            <div style={{ fontSize: "8px", fontStyle: "italic", color: "rgba(232,228,212,0.4)", marginTop: "3px" }}>{archetype.tagline}</div>
          </div>

          {/* Radar + DNA */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
            <RadarChart scores={archetype.dna} accent={archetype.radarAc} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", justifyContent: "center" }}>
              {DNA_AXES.map((axis, i) => (
                <div key={axis}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ fontSize: "5.5px", letterSpacing: "0.18em", color: "rgba(232,228,212,0.35)", textTransform: "uppercase" }}>{axis}</span>
                    <span style={{ fontSize: "5.5px", color: "rgba(232,228,212,0.25)", fontFamily: "'DM Mono', monospace" }}>{archetype.dna[i].toFixed(1)}</span>
                  </div>
                  <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(archetype.dna[i] / 10) * 100}%`, background: archetype.radarAc, borderRadius: "1px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: hasFilms ? "14px" : "0" }}>
            {archetype.tags.map(tag => (
              <span key={tag} style={{ fontSize: "5.5px", letterSpacing: "0.16em", color: "rgba(232,228,212,0.35)", border: "0.5px solid rgba(232,228,212,0.1)", padding: "3px 6px", borderRadius: "3px", textTransform: "uppercase" }}>{tag}</span>
            ))}
          </div>

          {/* Top 3 films */}
          {hasFilms && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "8px", color: "#E8E4D4", letterSpacing: "0.12em", textTransform: "uppercase" }}>FILM CLUB TOP 3</div>
                <div style={{ flex: 1, height: "0.5px", background: `linear-gradient(90deg, ${RED}60, transparent)` }} />
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {profile.top_films.slice(0, 3).map((film, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ aspectRatio: "2/3", borderRadius: "4px", overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", marginBottom: "4px" }}>
                      {film.posterPath
                        ? <img src={posterSrc(film.posterPath)} alt={film.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: "14px", opacity: 0.15 }}>♦</span></div>
                      }
                    </div>
                    <div style={{ fontSize: "5px", letterSpacing: "0.08em", color: "rgba(232,228,212,0.45)", lineHeight: 1.3, textAlign: "center" }}>{film.title || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archetype description */}
      <div style={{ maxWidth: "340px", width: "100%", marginTop: "28px", padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "0.5px solid rgba(255,255,255,0.05)" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontStyle: "italic", fontWeight: 300, color: "rgba(232,228,212,0.5)", lineHeight: 1.75, margin: 0 }}>
          {archetype.desc}
        </p>
      </div>

      {/* CTA */}
      <div style={{ marginTop: "32px", textAlign: "center" }}>
        <Link href="/quiz" style={{
          display: "inline-block",
          background: RED, color: "#fff",
          fontFamily: "'DM Mono', monospace", fontSize: "9px",
          letterSpacing: "0.22em", textTransform: "uppercase",
          padding: "13px 32px", borderRadius: "99px",
          textDecoration: "none",
        }}>
          Discover your identity →
        </Link>
        <p style={{ marginTop: "14px", fontSize: "7.5px", letterSpacing: "0.18em", color: "rgba(232,228,212,0.18)", textTransform: "uppercase" }}>
          Film Club · Wave 01
        </p>
      </div>
    </div>
  );
}
