import FilmClubPassport from "../../components/FilmClubPassport";

export default function PassportExportPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-3 py-6"
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
        className="relative z-10 flex aspect-[9/16] w-[min(92vw,calc(min(92vh,880px)*9/16))] max-h-[min(92vh,880px)] flex-col rounded-sm border border-[#fdf9e3]/10 bg-[#1a0c0c] shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
        style={{
          boxShadow: "0 40px 120px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,87,87,0.06)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-sm"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
            opacity: 0.05,
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-2 pb-2 pt-6 sm:px-4 sm:pt-8">
          <FilmClubPassport exportMode />
        </div>

        <div className="relative z-10 shrink-0 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1 text-center">
          <p
            className="font-anton text-[11px] tracking-[0.42em] text-[#fdf9e3]/25 sm:text-xs"
            style={{ letterSpacing: "0.42em" }}
          >
            FILM CLUB
          </p>
        </div>
      </div>
    </main>
  );
}
