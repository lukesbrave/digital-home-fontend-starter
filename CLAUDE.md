# Digital Home Starter

This is an open-source, AI-native website and content system. If someone opens this project and asks for help, walk them through the First Time Setup below step by step. Ask them for each piece of information as you go (API keys, project URLs, brand details) — don't assume anything.

## First Time Setup

If you just cloned this repo, follow these steps in order. You need both this repo (Frontend) and the [Digital Home Backend](https://github.com/lukesbrave/digital-home-backend) repo.

### Recommended Setup Flow

1. Create one parent folder on your machine called `digital-home`
2. Open that folder in Claude Code
3. Do the Frontend setup in **Chat 1**
4. Do the Backend setup in **Chat 2**
5. Use the **same Supabase project** for both repos

Using a separate chat for each repo helps Claude stay in the correct project context and avoids confusion between frontend and backend files, migrations, and environment variables.

### Step 0: Check for Node.js
Before anything else, check if the user has Node.js installed by running `node -v`. If the command fails or is not found, walk them through installing it: go to [nodejs.org](https://nodejs.org), download the LTS version, and run the installer. They need Node.js to run this project.

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Save these values from Settings > API:
   - **Project URL** (e.g., `https://abcdefg.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role secret key** (starts with `eyJ...` — keep this secret)

### Step 2: Run Database Migrations
1. In your Supabase dashboard, go to **SQL Editor**
2. Run each migration file from `supabase/migrations/` in order (001 through 011)
3. Then run the Backend migration from the Backend Starter repo:
   - `digital-home-backend/supabase/migrations/001_backend_core.sql`
4. The shared database is now ready for both repos:
   - public read access is limited to published content and active offers
   - admin and agent operations happen through protected API routes

### Step 3: Create an Admin User
1. In Supabase dashboard, go to **Authentication > Users > Add user**
2. Set an email and password — this is your login for the Backend dashboard
3. There is no public signup. All admin users are created here.

### Step 4: Set Up Environment Variables
```bash
cp .env.local.example .env.local
```
Fill in your Supabase URL, anon key, service role key and site name. If the
Backend is already running, also fill in its URL and CRM capture key. Otherwise
return to those two values after Step 10; the capture key must equal
`backend_settings.crm_capture_key` in the shared Supabase project. See
`CRM_CAPTURE.md` for the full contract.

### Step 5: Choose Your Design Direction
The fastest way to make this starter feel like yours is to generate a redesign prompt first, then hand that to Claude Code.

**Recommended flow:**
1. Open the [Prompt Builder](https://prompt-builder-pink.vercel.app)
2. Fill in your business details and preferred vibe
3. Copy the generated prompt
4. Paste it into Claude Code in this repo
5. Ask Claude to redesign the existing starter around your brand while keeping the working structure intact

Use wording like:
```text
Use this prompt to redesign the existing Digital Home starter for my brand. Keep the site architecture, page structure, and working integrations solid, but update the visual system, layout, typography, copy direction, and page styling to match my business.
```

If you skip Prompt Builder, ask the user for:
- business name
- industry
- what they do
- target audience
- unique value
- primary CTA
- preferred visual vibe

### Step 6: Set Up Your Content Corpus
```bash
cp -r content-corpus-examples/ content-corpus/
```
Edit each file in `content-corpus/` with your brand's voice, positioning, offers, testimonials, and keywords. **This is the most important step** — it's what makes the AI write like you instead of generic slop.

> **⚠️ Don't rush this step.** The content corpus is the difference between AI that writes like you and AI that writes like everyone else. A properly built corpus includes:
>
> - **Voice Guide** — your tone, writing style, personality, banned phrases, and influences
> - **Tone Examples** — real samples of how you write so the AI can mirror your cadence
> - **Content Hooks** — the angles, frameworks, and opening patterns that engage your audience
> - **Core Positioning** — who you serve, what you stand for, how you're different
> - **Offer Architecture** — your services, pricing structure, and transformation promise
> - **Competitive Landscape** — what alternatives exist and why your approach is better
> - **SEO Keyword Clusters** — the search terms and topic clusters you want to own
> - **Case Studies & Testimonials** — proof that your methodology works
>
> The example files in `content-corpus-examples/` show the format. You can fill them in yourself, or use the structured brand intake process and content corpus skill available in the [BraveBrand community](https://www.skool.com/bravebrand) — which walks you through a guided interview and generates all of these files from your answers.
>
> **Do not skip to the next step until your content corpus is complete.** Everything the AI writes — articles, SEO metadata, CTAs — is only as good as what you put here.

You also need three special entries in the `brand_context` table (add via Supabase dashboard → Table Editor → brand_context → Insert row):

**CTA Links** — the links the AI will use in article CTAs:
```
category: cta
key: links
content: (your CTA links in HTML — one per line, with descriptions of when to use each)
```

**Author Name** — the byline on articles:
```
category: identity
key: author
content: [Your Name]
```

**Image Style** — controls the AI-generated hero images (uses the backend's configured OpenAI image model):
```
category: content
key: image_style
content: (your image style description — composition, color palette, lighting, mood, what to avoid)
```
If no image style is configured, the system uses a clean editorial photography default. You can describe any aesthetic — minimalist, bold, illustrated, photographic — and every generated hero image will follow it.

### Step 7: Install and Run
```bash
npm install
npm run dev
```

### Step 8: Customize Your Pages
This starter is infrastructure plus a neutral baseline, not a finished website. Claude Code should treat the current pages as a starting point, then redesign them around the user's actual brand, offer, audience, and visual direction.

Claude Code can help — say "help me redesign this starter using my Prompt Builder output."

### Step 9: Deploy to Cloudflare

The user should have already:
1. Pushed this repo to their own GitHub
2. Connected the GitHub repo to Cloudflare (Workers & Pages > Create > Connect to Git)
3. Used the default build command (`npm run build`) and deploy command (`npx wrangler deploy`)
4. Completed the first build (it will deploy but the site won't work yet — that's expected)

Ask the user for their **Cloudflare Worker URL** (shown in the Cloudflare dashboard after the first deploy, e.g., `https://digital-home-frontend.username.workers.dev`) and their **Worker project name** (whatever they named it in Cloudflare).

Then do the following automatically:

1. **Update `wrangler.jsonc`** — read the values from `.env.local` and update:
   - `name` → their Cloudflare Worker project name
   - `vars.SUPABASE_URL` → the real `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`
   - `vars.SUPABASE_ANON_KEY` → the real `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`
   - `vars.BACKEND_URL` → the user's live Backend Worker URL

2. **Commit and push** — this triggers a Cloudflare rebuild with real values

3. **Set server-side secrets** — run these commands, reading each available value from `.env.local`:
   ```bash
   echo "VALUE" | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name WORKER_NAME
   echo "VALUE" | npx wrangler secret put API_SECRET_KEY --name WORKER_NAME
   echo "VALUE" | npx wrangler secret put CRM_CAPTURE_KEY --name WORKER_NAME
   ```
   Replace VALUE with the actual values from `.env.local` and WORKER_NAME with their Worker project name.

   If the Backend is not set up yet, defer `BACKEND_URL` and
   `CRM_CAPTURE_KEY` until Step 10. The capture key is the value of
   `backend_settings.crm_capture_key`, not a renamed `API_SECRET_KEY` unless
   those values were deliberately made equal.

4. **Verify** — ask the user to visit their Cloudflare Worker URL and confirm the site loads.

### Step 10: Set Up the Backend
Clone and set up the [Digital Home Backend](https://github.com/lukesbrave/digital-home-backend) repo — follow its CLAUDE.md for instructions. The Backend manages your content pipeline, and both repos share the same Supabase database.

After the Backend is live:

1. Open its `/crm/settings` page and generate/copy the lead capture key.
2. Set the frontend's `BACKEND_URL` to the live Backend Worker URL.
3. Set that exact key on the frontend Worker with
   `npx wrangler secret put CRM_CAPTURE_KEY --name <frontend-worker>`.
4. Deploy the frontend again and run the CRM smoke test in `CRM_CAPTURE.md`.

### Step 11: Set Up Autonomous Publishing (GitHub Actions)
The repo includes two GitHub Actions workflows in `.github/workflows/`:
- **`daily-publish.yml`** — ships as manual-first and calls the Backend's `/api/write-article` route to write and publish an article
- **`weekly-trends.yml`** — ships as manual-first and calls the Backend's implemented `/api/trend-scan` route to add new ideas to the content calendar

To enable these, add the following **secrets** to your GitHub repo (Settings > Secrets and variables > Actions > New repository secret):
1. **`API_SECRET_KEY`** — the shared secret between Frontend and Backend

And add this **repository variable** (Settings > Secrets and variables > Actions > Variables tab > New repository variable):
2. **`SITE_URL`** — your live Backend URL (e.g., `https://backend.yourdomain.com`) — the workflows call the Backend API directly

The workflows automatically sign each request with `x-timestamp` and `x-signature`, so you do not need Claude Code or hidden slash commands for automation.

Test both workflows manually before enabling cron:
- `Weekly Trend Scan` requires the Backend's `ANTHROPIC_API_KEY` and seeded `brand_context`; it adds calendar ideas. In safe mode, new ideas are `planned`; in autonomous mode, new ideas are `approved`.
- `Daily Article Publish` requires approved topics in the content calendar; in safe mode it creates drafts, and in autonomous mode it publishes live articles.

Once both repos are deployed and your Actions secrets/variables are configured, you can uncomment the `schedule:` block in the workflow files to make them run automatically.

### Step 12: Run the Fresh-Start Validation
Before assuming the setup is done, verify the whole loop:

1. Frontend loads locally with no missing-env crash
2. Backend login works
3. `https://your-backend-url.com/api/test-frontend` returns `status: 200`
4. `weekly-trends.yml` adds entries into `content_calendar`
5. After approving one idea, `daily-publish.yml` creates a draft or published article
6. A frontend lead submission returns `via: "backend"`, appears once in CRM,
   and has a `form_submitted` timeline activity

If all six checks pass, the shared database, CRM capture, backend connection,
and publishing automations are working correctly.

### Need Help?
The Digital Home is built and maintained by BraveBrand. If you want help with:
- The brand intelligence process (content corpus, voice guide, positioning)
- The deeper content strategy workflow
- Design guidance and implementation support
- A community of founders building their own Digital Homes

Join the [BraveBrand community on Skool](https://www.skool.com/bravebrand/about).

---

## Project Overview
This is a Next.js 15 website starter deployed on Cloudflare Workers with Supabase as the data layer. The site is designed to speak to three audiences simultaneously: human visitors (personalized UX), AI agents (REST API), and search engines/LLMs (structured data + llms.txt).

**This is the Frontend** — the client-facing public website. Behind it sits the **Digital Home Backend** (separate repo), which is the backend operating system — content pipeline, lead management, email sequences, analytics, and agent oversight. Both share the same Supabase database.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript, RSC by default)
- **Styling:** Tailwind CSS v4
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext)
- **Database:** Supabase (PostgreSQL) — schema in `/supabase/migrations/`
- **Email:** Resend
- **Auth:** Supabase Auth (admin dashboard only)

## Project Structure
```
/digital-home-frontend/
  CLAUDE.md              <- You are here
  /content-corpus-examples  <- Template brand files (copy to content-corpus/)
  /supabase/migrations      <- Database schema (run in order)
  /src
    /app
      layout.tsx         <- Root layout, metadata, fonts
      page.tsx           <- Homepage (skeleton)
      /blog              <- Blog index + article pages (functional)
      /services          <- Services page (skeleton)
      /about             <- About page (skeleton)
      /contact           <- Contact page (skeleton)
      /api               <- API routes (content, leads, email, analytics, etc.)
      /robots.txt        <- Dynamic robots.txt (AI-crawler friendly)
      /sitemap.ts        <- Dynamic sitemap from published content
      /llms.txt          <- llms.txt for AI agents
    /components
      /layout            <- NavBar (customize with your logo)
      /seo               <- SchemaMarkup (dynamic from entities)
    /lib
      /supabase          <- Supabase client (browser + server)
      /attribution       <- UTM, referrer, AI traffic detection
      /analytics         <- Event tracking
      /schema            <- JSON-LD generators, llms.txt generator
      /email             <- Resend client
    /types/database.ts   <- Shared database types (keep in sync with Backend)
    /middleware.ts       <- Visitor tracking, AI detection, personalization
```

## Environment Variables

### Build-time public variables
These go in the Cloudflare dashboard AND in `wrangler.jsonc` under `vars`:
```
NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
NEXT_PUBLIC_SITE_URL          — Your live site URL (e.g., https://yourdomain.com)
NEXT_PUBLIC_SITE_NAME         — Your brand name
SUPABASE_URL                  — Runtime duplicate for server-side access
SUPABASE_ANON_KEY             — Runtime duplicate for server-side access
BACKEND_URL                   — Live Backend Worker URL used for CRM capture
```

### Server-side secrets
Set via `wrangler secret put` from the terminal:
```
SUPABASE_SERVICE_ROLE_KEY     — Service role key, bypasses RLS
API_SECRET_KEY                — Shared secret between Frontend and Backend (must match both)
CRM_CAPTURE_KEY               — Must equal backend_settings.crm_capture_key
RESEND_API_KEY                — Resend email API key
RESEND_WEBHOOK_SECRET         — Resend webhook signing secret (required in production)
```

## Cloudflare / OpenNext Rules

This project runs on Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext). These rules prevent build and runtime failures:

### NEVER add edge runtime exports
Do **not** add `export const runtime = 'edge'` to any route file. OpenNext handles runtime assignment itself and rejects manual edge runtime exports.

### NEXT_PUBLIC_ vars don't exist at runtime on Workers
Cloudflare Workers can only read `NEXT_PUBLIC_` variables at build time (baked into the JS bundle). At runtime on the server, they're `undefined`. This is why:
- `wrangler.jsonc` has both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
- `src/lib/supabase/server.ts` uses the fallback pattern: `process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL`
- When creating new server-side code that reads env vars, always use this fallback pattern

### Secrets must be set via Wrangler CLI
Server-side secrets must be set using `wrangler secret put`. The Cloudflare dashboard UI only works for Pages projects, not Workers.

### Always run `npm run build` before pushing
`next dev` does not catch all TypeScript errors. `next build` does.

## Key Architecture Decisions
- **Cloudflare, not Vercel** — zero egress fees, predictable pricing
- **Native email (Resend), not a third-party platform** — unified data, agent-managed, no platform lock-in
- **Content as structured objects** — every piece of content is a row in `content_objects` with metadata, semantic tags, associated offers, and performance data
- **Personalization via rules engine** — JSON rules stored in `personalization_rules` table, evaluated per visitor on each page load
- **Knowledge graph in the database** — `entities` and `entity_relationships` tables, JSON-LD generated dynamically
- **Schema markup on every page** — dynamically generated from `entities` table, never hardcoded

## Important Conventions
- **Server Components by default.** Only use `'use client'` when interactivity requires it.
- Public API surface is intentionally small:
  - public: content reads, active offers, analytics event posting, lead capture
  - admin/session-only: visitors, leads queries, analytics queries, content calendar, entities, agent logs
  - agent-capable: selected write routes using `x-api-key`
- Every page should include dynamic JSON-LD from the `entities` table.
- Visitor tracking is anonymous until opt-in. No PII before email capture.
- **CRITICAL — Shared database types:** When you modify `src/types/database.ts`, you MUST also update the same file in the Backend project. These two files must always be identical.
- **CRM capture:** public lead forms route through the Backend so activities and
  workflows run. Payments, memberships and entitlements must call
  `captureLeadServerSide(payload, {allowFallback:false})`; see `CRM_CAPTURE.md`.

## Customization Guide

### Pages to customize (in order of importance)
1. **`src/app/page.tsx`** — Homepage: headline, description, services preview, CTA
2. **`src/app/about/page.tsx`** — Your story, beliefs, team members
3. **`src/app/services/page.tsx`** — Your service offerings
4. **`src/app/contact/page.tsx`** — Contact methods and email
5. **`src/app/layout.tsx`** — Site title and metadata
6. **`src/components/layout/NavBar.tsx`** — Your logo/brand name

### Design customization
- **Colors:** Edit CSS variables in `src/app/globals.css` (the `:root` block)
- **Fonts:** Replace the Google Fonts imports in `src/app/layout.tsx` or add your own @font-face
- **Logo:** Replace `[YOUR BRAND]` text in NavBar.tsx with an `<img>` tag pointing to your logo in `/public/`

### Recommended Claude handoff
If the user wants a faster starting point, direct them to the Prompt Builder first:
- Prompt Builder: `https://prompt-builder-pink.vercel.app`
- Then have them paste the generated prompt into Claude Code in this repo
- Goal: redesign the current starter, not rebuild the architecture from scratch unless there is a good reason

### Content that auto-populates from the database
- Blog articles (written by the Backend's AI content pipeline)
- JSON-LD schema (from the `entities` table)
- llms.txt (from entities, content, and offers)
- Sitemap (from published content)
