"use client";

import { motion, useReducedMotion } from "framer-motion";
import PassportQR from "./PassportQR";

const ONYX = "#1a0c0c";
const CREAM = "#fdf9e3";
const RED = "#ff5757";
const FC_URL = "https://filmclubapp.com";

type DnaPoint = {
  label: string;
  value: number;
};

const DNA_POINTS: DnaPoint[] = [
  { label: "Emotion", value: 0.86 },
  { label: "Intellectual", value: 0.74 },
  { label: "Visual", value: 0.93 },
  { label: "Pace", value: 0.61 },
  { label: "Story", value: 0.79 },
];

const DIRECTORS_PIPE = "VILLENEUVE | WONG KAR-WAI | WELLS";

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function buildPolygon(values: number[], radius: number, cx: number, cy: number) {
  const step = (Math.PI * 2) / values.length;
  return values
    .map((v, i) => {
      const angle = -Math.PI / 2 + step * i;
      const p = polarToCartesian(cx, cy, radius * v, angle);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

function CornerMarks() {
  const arm = 26;
  const stroke = `rgba(253,249,227,0.2)`;
  const inset = 14;
  return (
    <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
      {/* top-left */}
      <svg
        className="absolute"
        style={{ top: inset, left: inset, width: arm, height: arm }}
        viewBox={`0 0 ${arm} ${arm}`}
      >
        <path d={`M0 ${arm} L0 0 L${arm} 0`} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
      {/* top-right */}
      <svg
        className="absolute"
        style={{ top: inset, right: inset, width: arm, height: arm }}
        viewBox={`0 0 ${arm} ${arm}`}
      >
        <path d={`M0 0 L${arm} 0 L${arm} ${arm}`} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
      {/* bottom-left */}
      <svg
        className="absolute"
        style={{ bottom: inset, left: inset, width: arm, height: arm }}
        viewBox={`0 0 ${arm} ${arm}`}
      >
        <path d={`M0 0 L0 ${arm} L${arm} ${arm}`} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
      {/* bottom-right */}
      <svg
        className="absolute"
        style={{ bottom: inset, right: inset, width: arm, height: arm }}
        viewBox={`0 0 ${arm} ${arm}`}
      >
        <path d={`M${arm} 0 L${arm} ${arm} L0 ${arm}`} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
    </div>
  );
}

export type FilmClubPassportProps = {
  /** Instagram Story export: tighter chrome, sized for 9:16 shell */
  exportMode?: boolean;
};

export default function FilmClubPassport({ exportMode = false }: FilmClubPassportProps) {
  const reduceMotion = useReducedMotion();
  const size = exportMode ? 220 : 260;
  const center = size / 2;
  const radius = exportMode ? 78 : 94;
  const web = [1, 0.75, 0.5, 0.25];
  const pointCount = DNA_POINTS.length;
  const pad = exportMode ? "p-4 sm:p-5" : "p-6 sm:p-8";
  const maxW = exportMode ? "max-w-[min(100%,280px)]" : "max-w-[min(100%,380px)]";

  return (
    <article
      className={`relative mx-auto flex w-full flex-col ${maxW} overflow-hidden rounded-[28px] border ${pad}`}
      style={{
        aspectRatio: "3 / 4",
        backgroundColor: ONYX,
        color: CREAM,
        borderColor: "rgba(253,249,227,0.12)",
        boxShadow:
          "0 32px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,87,87,0.08) inset, 0 0 80px rgba(255,87,87,0.06)",
      }}
    >
      {/* Film grain — full card */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          opacity: 0.05,
        }}
      />

      <CornerMarks />

      {/* Authority header */}
      <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-2 border-b border-[#fdf9e3]/12 pb-4">
        <div />
        <div className="min-w-0 text-center">
          <h1
            className="font-anton text-[26px] leading-none tracking-[0.12em] text-[#fdf9e3] sm:text-[30px]"
            style={{ letterSpacing: "0.14em" }}
          >
            FILM CLUB
          </h1>
          <p className="mt-2 font-mono text-[7px] uppercase leading-relaxed tracking-[0.22em] text-[#fdf9e3]/45 sm:text-[8px]">
            Identity verification system // Issued 2026
          </p>
        </div>
        <div className="pt-0.5 text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#ff5757] sm:text-[10px]">
            FC-02971
          </p>
          <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.16em] text-[#fdf9e3]/35">
            Founding
          </p>
        </div>
      </header>

      {/* Identity hero */}
      <section className="relative z-10 mt-5 grid grid-cols-[minmax(0,88px)_1fr] items-end gap-4 sm:grid-cols-[minmax(0,100px)_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-[#fdf9e3]/18 bg-[#120606]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(145deg, rgba(26,12,12,0.2), rgba(255,87,87,0.15)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23281414' width='120' height='120'/%3E%3C/svg%3E\")",
            }}
          />
          <div
            className="absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: RED, opacity: 0.38 }}
          />
          <div
            className="absolute inset-0 mix-blend-color"
            style={{ backgroundColor: ONYX, opacity: 0.55 }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E\")",
              opacity: 0.35,
              mixBlendMode: "overlay",
            }}
          />
          <div className="relative flex h-full w-full items-center justify-center">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#fdf9e3]/35">
              Photo
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#fdf9e3]/40">
            Taste archetype
          </p>
          <h2
            className="mt-1 font-anton uppercase text-[clamp(1.35rem,4.5vw,2.15rem)] leading-[0.95] tracking-[0.08em] text-[#fdf9e3]"
            style={{
              WebkitTextStroke: "0.6px rgba(255,87,87,0.45)",
              textShadow:
                "0 0 1px rgba(255,87,87,0.9), 0 0 18px rgba(255,87,87,0.18), 0 0 42px rgba(255,87,87,0.08)",
            }}
          >
            The sonic architect
          </h2>
        </div>
      </section>

      {/* Taste DNA — instrument */}
      <section className="relative z-10 mt-5 flex min-h-[140px] flex-1 flex-col rounded-2xl border border-[#fdf9e3]/10 bg-[#160808]">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 85% 70% at 50% 48%, rgba(255,87,87,0.22) 0%, rgba(255,87,87,0.08) 38%, rgba(255,87,87,0) 72%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-between px-4 pt-3 sm:px-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#fdf9e3]/50">
            Taste DNA
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#ff5757]/90">
            Verified signal
          </p>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-2 pb-2 pt-1">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className={exportMode ? "h-[180px] w-[180px]" : "h-[210px] w-[210px] sm:h-[236px] sm:w-[236px]"}
            role="img"
            aria-label="Taste DNA radar chart"
          >
            <defs>
              <radialGradient id="fc-radar-glow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#ff5757" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#ff5757" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#ff5757" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={center} cy={center} r={radius + 8} fill="url(#fc-radar-glow)" />

            {web.map((w) => (
              <polygon
                key={w}
                points={buildPolygon(
                  Array.from({ length: pointCount }, () => w),
                  radius,
                  center,
                  center,
                )}
                fill="none"
                stroke="rgba(253,249,227,0.55)"
                strokeWidth={0.75}
              />
            ))}

            {DNA_POINTS.map((point, i) => {
              const angle = -Math.PI / 2 + ((Math.PI * 2) / pointCount) * i;
              const outer = polarToCartesian(center, center, radius + 16, angle);
              const axis = polarToCartesian(center, center, radius, angle);
              return (
                <g key={point.label}>
                  <line
                    x1={center}
                    y1={center}
                    x2={axis.x}
                    y2={axis.y}
                    stroke="rgba(253,249,227,0.5)"
                    strokeWidth={0.75}
                  />
                  <text
                    x={outer.x}
                    y={outer.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(253,249,227,0.72)"
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: exportMode ? "7.5px" : "8.5px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}

            <motion.g
              style={{ transformOrigin: `${center}px ${center}px` }}
              initial={{ scale: reduceMotion ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.52,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
            >
              <polygon
                points={buildPolygon(
                  DNA_POINTS.map((p) => p.value),
                  radius,
                  center,
                  center,
                )}
                fill="rgba(255,87,87,0.2)"
                stroke="#ff5757"
                strokeWidth={1.1}
              />
              {DNA_POINTS.map((point, i) => {
                const angle = -Math.PI / 2 + ((Math.PI * 2) / pointCount) * i;
                const p = polarToCartesian(center, center, radius * point.value, angle);
                return <circle key={`${point.label}-dot`} cx={p.x} cy={p.y} r="2.5" fill="#ff5757" />;
              })}
            </motion.g>
          </svg>
        </div>
      </section>

      {/* Proof + viral hook */}
      <footer className="relative z-10 mt-auto flex min-h-0 flex-col border-t border-[#fdf9e3]/12 pt-4">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-[#fdf9e3]/75">
          {DIRECTORS_PIPE}
        </p>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <p className="max-w-[55%] break-all font-mono text-[7px] leading-snug tracking-[0.04em] text-[#fdf9e3]/28">
            {FC_URL}
          </p>
          <div className="ml-auto flex items-end gap-3">
            <p className="max-w-[76px] text-right font-mono text-[6.5px] uppercase leading-snug tracking-[0.18em] text-[#fdf9e3]/42">
              Scan to sync taste.
            </p>
            <PassportQR url={FC_URL} displaySize={exportMode ? 72 : 80} />
          </div>
        </div>
      </footer>
    </article>
  );
}
