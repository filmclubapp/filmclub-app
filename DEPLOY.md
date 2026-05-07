# Film Club — Deploy to Production

## One-time setup (run in your terminal from the filmclub-app folder)

### 1. Commit everything
```bash
cd "FILM CLUB/filmclub-app"

git add app/quiz/ package.json package-lock.json \
  app/discover/page.tsx app/lib/tmdb.ts \
  app/components/ app/films-that-changed-my-life/ \
  app/passport/ supabase/

git commit -m "feat: identity quiz, ID card, discover page"
git push origin main
```

### 2. Deploy to Vercel (first time)
```bash
npx vercel
```
- Link to existing project? → **No** (new project)
- What's your project name? → `filmclub-app` (or whatever you want)
- Which directory? → `./` (current)
- Override settings? → **No**

### 3. Add environment variables on Vercel
Go to **vercel.com → your project → Settings → Environment Variables** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | from your Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from your Supabase project settings |
| `NEXT_PUBLIC_TMDB_API_KEY` | from themoviedb.org (used client-side for search) |
| `MAILCHIMP_API_KEY` | Mailchimp → Account → Extras → API Keys (e.g. `abc123-us1`) |
| `MAILCHIMP_AUDIENCE_ID` | Mailchimp → Audience → Settings → Audience name and defaults → Audience ID |

Then redeploy:
```bash
npx vercel --prod
```

### 4. Future deploys
Every `git push origin main` will auto-deploy if you connect the GitHub repo on Vercel (Settings → Git).

Or manually:
```bash
npx vercel --prod
```

---

## Quiz is live at
`https://your-project.vercel.app/quiz`

Share this link anywhere — TikTok bio, Instagram, email list.
