import Link from "next/link";
import FilmClubPassport from "../components/FilmClubPassport";

export default function PassportPage() {
  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-14"
      style={{
        backgroundColor: "#1a0c0c",
        color: "#fdf9e3",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          opacity: 0.05,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255,87,87,0.12) 0%, rgba(255,87,87,0.04) 45%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[960px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center sm:mb-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#fdf9e3]/45">
              Share card preview
            </p>
            <h1 className="mt-2 font-anton text-[38px] leading-[0.9] tracking-[0.08em] text-[#fdf9e3] sm:text-[52px]">
              Your passport
            </h1>
          </div>
          <Link
            href="/passport/export"
            className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#ff5757] underline decoration-[#ff5757]/40 underline-offset-4 transition hover:text-[#fdf9e3]"
          >
            Open 9:16 export (stories)
          </Link>
        </div>

        <div className="flex justify-center pb-8">
          <FilmClubPassport />
        </div>
      </div>
    </main>
  );
}
