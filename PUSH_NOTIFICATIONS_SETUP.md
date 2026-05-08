# Push Notifications — Step-by-Step

Follow these in order. Each section takes 2–10 minutes. No prior experience needed.

---

## 1. Generate VAPID keys (your server's "identity" for push)

VAPID keys are two paired strings: a **public** one the browser sees, and a **private** one only your server knows. They sign push messages.

### Steps

1. Open a terminal in the `filmclub-app` folder.
2. Run:
   ```bash
   npx web-push generate-vapid-keys
   ```
   It prints two strings:
   ```
   Public Key:  BK7x...Pq4E
   Private Key: xH7d...9vLa
   ```
3. **Copy both.** You won't be able to regenerate the same pair.

### Add them to your env

Open (or create) `.env.local` in the `filmclub-app` folder and add:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK7x...Pq4E
VAPID_PRIVATE_KEY=xH7d...9vLa
VAPID_CONTACT_EMAIL=mailto:you@filmclub.app
```

- `NEXT_PUBLIC_` prefix = safe for the browser.
- No prefix = server-only secret. **Never commit the private key.**

Make sure `.env.local` is in your `.gitignore` (it should be by default in Next.js).

Restart `npm run dev`. The "Turn on notifications" button on the profile page will now work in the browser.

---

## 2. Backend delivery via a Supabase Edge Function

The client saves a subscription to `push_subscriptions`. To actually *send* a notification, you need a tiny backend that reads that row and calls Web Push. Supabase Edge Functions are free and perfect for this.

### 2a. Install the Supabase CLI (one-time)

```bash
brew install supabase/tap/supabase    # macOS
# or: npm install -g supabase
```

Then from the `filmclub-app` folder:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

(Your project ref is the slug in your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`.)

### 2b. Create the function

```bash
supabase functions new send-push
```

This creates `supabase/functions/send-push/index.ts`. Replace its contents with:

```ts
// supabase/functions/send-push/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUB  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIV = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_MAIL = Deno.env.get("VAPID_CONTACT_EMAIL") ?? "mailto:hello@filmclub.app";

webpush.setVapidDetails(VAPID_MAIL, VAPID_PUB, VAPID_PRIV);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const { user_ids, title, body, url } = await req.json();
  if (!Array.isArray(user_ids) || !title || !body) {
    return new Response("bad payload", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .in("user_id", user_ids);
  if (error) return new Response(error.message, { status: 500 });

  const payload = JSON.stringify({ title, body, url: url ?? "/home" });
  const results = await Promise.allSettled(
    (subs ?? []).map((s) => webpush.sendNotification(s.subscription, payload))
  );

  // Clean up subscriptions that 404/410 (user uninstalled PWA)
  const dead: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) dead.push(subs![i].id);
    }
  });
  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }

  return new Response(JSON.stringify({ sent: subs?.length ?? 0, pruned: dead.length }), {
    headers: { "content-type": "application/json" },
  });
});
```

### 2c. Set function secrets

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=BK7x...Pq4E \
  VAPID_PRIVATE_KEY=xH7d...9vLa \
  VAPID_CONTACT_EMAIL=mailto:you@filmclub.app
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.)

### 2d. Deploy

```bash
supabase functions deploy send-push --no-verify-jwt
```

`--no-verify-jwt` is fine here because we'll call it from the server side with the service role.

### 2e. Test it

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push" \
  -H "Authorization: Bearer YOUR_ANON_OR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_ids":["<your-user-id>"],"title":"Test from Film Club","body":"It works.","url":"/home"}'
```

You should see a notification on the device where you enabled push.

---

## 3. Triggering pushes from the app

Anywhere in your app (or a pg_cron job), call the function. Example: when a new post lands in a club, notify members.

### Option A — From a Postgres trigger (recommended for club posts, nominations, polls)

```sql
create extension if not exists http;

create or replace function notify_club_members() returns trigger as $$
declare
  member_ids uuid[];
begin
  select array_agg(user_id) into member_ids
  from club_memberships where club_id = new.club_id and user_id <> new.user_id;

  if member_ids is not null then
    perform net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_ids', member_ids,
        'title',    'New in your club',
        'body',     'Someone just posted.',
        'url',      '/clubs/' || new.club_id
      )
    );
  end if;
  return new;
end; $$ language plpgsql security definer;

create trigger trg_notify_club_post
after insert on club_posts
for each row execute function notify_club_members();
```

### Option B — From a scheduled task (for streak nudges, weekly FOTW reminders)

Use Supabase's **pg_cron**:

```sql
select cron.schedule(
  'daily-streak-nudge',
  '0 19 * * *',  -- every day at 19:00 UTC
  $$ select net.http_post(...) $$
);
```

---

## 4. Sanity checks

- On iOS, **push only works from a PWA installed to the home screen** (Safari → Share → Add to Home Screen). The "Turn on notifications" button will still show on Safari mobile but permission is only grantable inside the installed PWA.
- On Chrome/Edge desktop, push works in the regular tab once the SW is registered.
- If the button stays stuck on "BLOCKED", the user denied permission in the browser. They'll need to clear site settings or re-enable in system settings.

---

## 5. Where everything lives

| Thing                       | Location                                              |
|----------------------------|-------------------------------------------------------|
| VAPID public key (browser) | `.env.local` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         |
| VAPID private key (server) | Supabase function secrets                             |
| Service worker             | `public/sw.js`                                        |
| Manifest                   | `public/manifest.json`                                |
| App icons                  | `public/icon-192.png`, `public/icon-512.png`          |
| Client subscribe helpers   | `app/lib/push.ts`                                     |
| Toggle UI                  | `app/components/NotificationsToggle.tsx` (on profile) |
| Subscriptions table        | `push_subscriptions` in Supabase                      |
| Delivery backend           | `supabase/functions/send-push/`                       |
