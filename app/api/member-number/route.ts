/**
 * GET /api/member-number
 *
 * Returns the next available sequential Film Club member number.
 * First person → FC-0001, second → FC-0002, etc.
 *
 * Uses the count of existing profiles rows + 1.
 * For production: swap for a Postgres sequence / atomic counter if needed.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const next = (count ?? 0) + 1;
    const formatted = `FC-${String(next).padStart(4, "0")}`;

    return NextResponse.json({ number: next, formatted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
