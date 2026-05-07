/**
 * Proxies TMDB poster images through Next.js so the browser
 * never sees a cross-origin request — no CORS issues, no broken imgs.
 *
 * Usage: /api/tmdb-image?path=/abc123.jpg&size=w342
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const size = searchParams.get("size") ?? "w342";

  if (!path) {
    return new NextResponse("Missing path", { status: 400 });
  }

  try {
    const upstream = await fetch(`https://image.tmdb.org/t/p/${size}${path}`, {
      headers: { Accept: "image/*" },
    });

    if (!upstream.ok) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
