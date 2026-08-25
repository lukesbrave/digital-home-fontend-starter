# Digital Home Frontend

An open-source, agent-native website starter kit built for digital sovereignty. Fully owned infrastructure, no platform lock-in.

> **API compatibility:** public `POST /api/leads` now returns
> `{ok, lead_id, created, via}` (`201` for create, `200` for update, `503` for a
> critical capture failure). Older custom forms that consumed the full lead row
> must migrate to this response contract. See `CRM_CAPTURE.md`.

This is the **Frontend starter** — a website starter with the full architecture already built. It handles SEO, AI traffic detection, personalization, email, analytics, and a blog powered by AI-generated content. Behind it sits the [Digital Home Backend](https://github.com/lukesbrave/digital-home-backend) — the operating system that manages content, leads, email, analytics, and AI agents. Both share the same Supabase database.

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     FRONTEND             │     │     BACKEND             │
│  (Public Website)        │     │  (Operating System)     │
│                          │     │                         │
│  Homepage, Blog,         │     │  Content Pipeline,      │
│  Services, Contact,      │     │  Lead Management,       │
│  SEO, AI Detection       │     │  Email, Analytics,      │
│                          │     │  Agent Oversight         │
│  yourdomain.com          │     │  backend.yourdomain.com │
└───────────┬──────────────┘     └───────────┬─────────────┘
            └───────────┬────────────────────┘
                        │
              ┌─────────▼─────────┐
              │     SUPABASE      │
              │  (Shared Database) │
              └───────────────────┘
```

## What You Get

**Full architecture, light design opinion:**
- Supabase database with 11 migration files (visitors, content, offers, leads, analytics, entities, email, etc.)
- API routes for everything (content, leads, analytics, email, entities, offers, agent logs)
- Middleware: visitor tracking, AI traffic detection, personalization rules
- Blog that pulls from Supabase and renders AI-generated articles
- JSON-LD schema markup (dynamic from database)
- llms.txt and robots.txt (AI-crawler friendly)
- Cloudflare Workers deployment via OpenNext
- Content corpus example files (voice, positioning, offers, proof, SEO)

**Starter pages you customize:**
- Homepage, About, Services, Contact, Blog — all functional and ready to adapt
- Neutral starter copy and structure you can replace with your own brand
- Dark theme baseline, ready for Claude-guided redesign

> **This is infrastructure with a neutral baseline, not a finished brand site.** The starter is meant to give you a working architecture plus a clean foundation you can redesign around your own brand, content, colors, and typography.

## Getting Started

### Recommended Setup Flow

1. Create one parent folder on your machine called `digital-home`
2. Open that folder in Claude Code
3. In **Chat 1**, paste the Frontend Starter repo and complete the frontend setup first
4. In **Chat 2**, paste the Backend Starter repo and complete the backend setup second
5. Use the **same Supabase project** for both repos

Using a separate chat for each repo helps Claude stay in the correct project context and avoids confusion between frontend and backend files, migrations, and environment variables.

1. **Clone both starters**
   ```bash
   git clone https://github.com/lukesbrave/digital-home-frontend.git
   git clone https://github.com/lukesbrave/digital-home-backend.git
   ```

2. **Set up Supabase** — create one project at [supabase.com](https://supabase.com), run the Frontend migrations in `digital-home-frontend/supabase/migrations/` (`001` through `011`), then run the Backend migration in `digital-home-backend/supabase/migrations/001_backend_core.sql`

3. **Set up the Frontend environment**
   ```bash
   cd digital-home-frontend
   cp .env.local.example .env.local
   npm install
   ```
   Fill in your credentials, including `RESEND_WEBHOOK_SECRET` for production webhook verification.

4. **Design your site direction first** — use the [Prompt Builder](https://prompt-builder-pink.vercel.app) to generate a starter redesign prompt, then paste that prompt into Claude Code in this repo and ask it to redesign the existing starter around your brand. If you skip Prompt Builder, Claude can still help from a written brief.

5. **Set up your content corpus** — `cp -r content-corpus-examples/ content-corpus/` and fill in your brand data

6. **Run locally**
   ```bash
   npm run dev
   ```

7. **Open Claude Code** — paste your Prompt Builder output and say "redesign this starter around my brand while keeping the working site structure intact"

See `CLAUDE.md` for the complete setup guide, architecture docs, and Cloudflare deployment instructions.

For automation, the included GitHub Actions now call the Backend API directly and sign each request automatically. No hidden Claude slash commands are required.

## Fresh-Start Validation

After both repos are configured, do this quick health check:

1. Visit the Frontend locally and confirm the starter renders without missing env errors.
2. Log into the Backend and confirm the content dashboard loads.
3. Open the Backend test route and confirm it can reach the Frontend: `/api/test-frontend`
4. Manually run `weekly-trends.yml` in GitHub Actions and confirm new `content_calendar` ideas appear. This requires the Backend's `ANTHROPIC_API_KEY` and seeded `brand_context`.
5. Approve one idea, then manually run `daily-publish.yml` and confirm a draft or published article appears in the blog. Enable the cron schedules only after both manual runs succeed.

If those five checks pass, the shared Supabase setup, cross-repo connection, and automation loop are all working.

## Community

The Digital Home is built and maintained by [BraveBrand](https://bravebrand.com). The code is free and open-source — clone it, deploy it, make it yours.

The part the code can't fully give you is the **brand intelligence** that makes it work at a high level: the content corpus process, the brand context inputs, and the deeper strategy behind what to feed your agents so they sound like you instead of generic AI. If you want help with that part, the [BraveBrand community on Skool](https://www.skool.com/bravebrand/about) is where we teach the deeper workflow and support people building their own Digital Homes.

## Related

- [Digital Home Backend](https://github.com/lukesbrave/digital-home-backend) — the operating system behind the storefront
- [CLAUDE.md](./CLAUDE.md) — full technical documentation

## License

MIT — see [LICENSE](./LICENSE)
