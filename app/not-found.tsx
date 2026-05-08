import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0c16",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.28em",
          color: "rgba(232,228,212,0.4)",
          textTransform: "uppercase",
          marginBottom: "28px",
        }}
      >
        FILM CLUB
      </p>

      <h1
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: "clamp(72px, 20vw, 120px)",
          lineHeight: 0.9,
          color: "#FF4A4A",
          textTransform: "uppercase",
          marginBottom: "16px",
          letterSpacing: "0.04em",
        }}
      >
        404
      </h1>

      <div
        style={{
          width: "28px",
          height: "1.5px",
          background: "#FF4A4A",
          opacity: 0.6,
          margin: "0 auto 20px",
        }}
      />

      <p
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: "14px",
          letterSpacing: "0.12em",
          color: "rgba(232,228,212,0.5)",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        THIS SCENE DOESN&apos;T EXIST.
      </p>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          fontStyle: "italic",
          fontWeight: 300,
          color: "rgba(232,228,212,0.3)",
          lineHeight: 1.7,
          marginBottom: "36px",
        }}
      >
        The page you&apos;re looking for has been cut from the final edit.
      </p>

      <Link
        href="/quiz"
        style={{
          display: "inline-block",
          background: "#FF4A4A",
          color: "#fff",
          fontFamily: "'Anton', sans-serif",
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "14px 32px",
          borderRadius: "999px",
          textDecoration: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        ← Back to Quiz
      </Link>
    </main>
  );
}
