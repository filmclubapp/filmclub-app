/**
 * POST /api/waitlist
 *
 * Adds or updates a waitlist entry, then subscribes the user to Mailchimp
 * so the welcome email automation fires.
 *
 * - New email  -> inserts a row, subscribes to Mailchimp, returns { success, isNew: true }
 * - Known email -> updates username / archetype / films but PRESERVES
 *   the original member_number (keeps their place in the queue),
 *   returns { success, isNew: false }
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";

/* -- Mailchimp ------------------------------------------------- */
async function addToMailchimp(email: string, username: string | undefined) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !listId) return;

  const dc   = apiKey.split("-").pop();
  const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");

  try {
    await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        email_address: email,
        status:        "subscribed",
        tags:          ["new-signup"],
        merge_fields:  { FNAME: username ?? "" },
      }),
    });
  } catch {
    // ignore
  }
}

/* -- Route handler --------------------------------------------- */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  let body: {
    email?: string;
    username?: string;
    archetype_id?: string;
    member_number?: string;
    top_films?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, username, archetype_id, member_number, top_films } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  if (!emailOk) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cleanEmail = email.trim().toLowerCase();

  const { data: existing, error: checkErr } = await supabase
    .from("waitlist")
    .select("id, member_number")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (checkErr) {
    return NextResponse.json({ error: checkErr.message }, { status: 500 });
  }

  if (existing) {
    const { error: updateErr } = await supabase
      .from("waitlist")
      .update({
        username,
        archetype_id,
        top_films,
        updated_at: new Date().toISOString(),
      })
      .eq("email", cleanEmail);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isNew: false,
      member_number: existing.member_number,
    });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("waitlist")
    .insert({
      email: cleanEmail,
      username,
      archetype_id,
      member_number,
      top_films,
    })
    .select("member_number")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await addToMailchimp(cleanEmail, username);

  return NextResponse.json({
    success: true,
    isNew: true,
    member_number: inserted.member_number,
  });
}
