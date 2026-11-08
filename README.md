# NEONDEV Pulse

**Uptime monitoring & public status pages.** Know it's down before your users do.

`Next.js 15` · `React 19` · `TypeScript` · `Tailwind CSS 4` · `Supabase` · `Vercel`

> 🚧 Work in progress — Phase 3 of 7 (check engine).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the landing page and `/dashboard` render with demo data, no keys needed yet.

## Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste `supabase/migrations/0001_init.sql` → **Run**.
3. **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000` and add
   `http://localhost:3000/auth/callback` to *Redirect URLs*.
4. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API**.
5. Restart `npm run dev`, open `/login` and create an account.

> Tip: for faster local testing you can turn off **Authentication → Sign In / Providers → Email → Confirm email**.

## How checks run

`src/lib/checker.ts` pings every due monitor (8 in parallel), retries once before marking a site down,
stores each result in `checks`, and opens / resolves `incidents` automatically.

- **Scheduled:** `deploy/uptime-checks.yml` (move it to `.github/workflows/` when deploying) calls `POST /api/cron/check` every 5 minutes
  with `Authorization: Bearer $CRON_SECRET`. Add `PULSE_URL` and `CRON_SECRET` as repository secrets after deploying.
- **Manual:** the **Check now** button on the dashboard.
- **Locally:** `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/check`

## Roadmap

- [x] **1. Setup** — scaffold, NEONDEV design system, DB schema + RLS
- [x] **2. Auth + dashboard** — sign up / login, add · edit · delete monitors
- [x] **3. Check engine** — `/api/cron/check` + GitHub Actions schedule (every 5 min)
- [ ] **4. Monitor detail** — uptime 24h/7d/30d, response-time chart, incident timeline
- [ ] **5. Alerts** — email on down & recovery
- [ ] **6. Public status page** — `/status/[slug]` with 90-day history
- [ ] **7. Portfolio** — add NEONDEV Pulse to the NEONDEV portfolio site

## Project structure

```
src/
  app/            routes (landing, login, auth callback, dashboard, add/edit monitor)
  components/     NEONDEV UI primitives (Logo, StatusDot, UptimeBar, Sparkline, Backdrop)
  lib/            types, demo data, Supabase clients
supabase/
  migrations/     SQL schema
```

## License

MIT
