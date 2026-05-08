import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Missing Supabase environment configuration." },
        { status: 500 },
      );
    }

    const { email, password, username } = (await req.json()) as {
      email?: string;
      password?: string;
      username?: string;
    };

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, password, and username are required." },
        { status: 400 },
      );
    }

    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        data: { username },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.msg || data?.error_description || data?.error || "Sign up failed." },
        { status: res.status },
      );
    }

    return NextResponse.json({
      access_token: data.access_token ?? null,
      refresh_token: data.refresh_token ?? null,
      user: data.user ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach auth service. Try again." },
      { status: 500 },
    );
  }
}
