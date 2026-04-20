# Sponza — Codebase Documentation

## Overview
Sponza is a creator sponsorship tool. Users paste their channel URL, get a free Sponsorship Readiness Score, and can unlock a paid sponsorship kit or a lower-cost refresh via Stripe-hosted one-time checkout.

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL (Neon DB) via `pg` package
- Stripe payments via NanoCorp (no SDK needed)
- Deployed on Vercel at https://sponza.nanocorp.app

## File Structure
```
app/
  layout.tsx              — Root layout, Google Fonts (Playfair Display + DM Sans), analytics beacon
  globals.css             — CSS variables (navy/gold/white), custom animations, font imports
  page.tsx                — Landing page (Hero, How It Works, Features, Testimonials, FAQ, Footer)
  results/page.tsx        — Free tier results page (Score gauge, brand cards, pitch email, rate card, PDF preview, CTA)
  api/generate-kit/route.ts — POST endpoint — scrape, cache, gate, and return sponsorship kit output
  api/submit/route.ts     — POST endpoint — stores URL submission in Neon DB
  api/webhooks/nanocorp/route.ts — Stripe webhook handler (checkout.session.completed)
  checkout/success/page.tsx — Post-payment thank-you page
lib/
  db.ts                   — Shared Neon `pg` pool + table bootstrap for submissions, kits, unlocks, failures
  sponza/utils.ts         — URL normalization, platform detection, hashing, parsing helpers
  sponza/scrape.ts        — YouTube API scraper + Instagram/TikTok public metadata fallbacks
  sponza/llm.ts           — Single GPT-4o JSON-schema prompt for full sponsorship kit generation
  sponza/service.ts       — Cache lookup, free/paid gating, failure logging, payment unlock persistence
```

## Design System
- **Colors**: `--navy: #0F1B2D`, `--warm-white: #FAFAF8`, `--gold: #F5A623`
- **Typography**: Playfair Display (display/headings) + DM Sans (body)
- **Font class**: `.font-display` → `font-family: 'Playfair Display', serif`

## Database
- Table: `submissions (id, url, email, platform, created_at)`
- Table: `sponsorship_kits (url_hash, niche_hash, cache_key, platform, full_kit_json, scrape_json, email, paid_at, created_at, updated_at)`
- Table: `payment_unlocks (email, amount_cents, currency, stripe_session_id, created_at, updated_at)`
- Table: `kit_failures (url, email, platform, cache_key, step, error_message, details, created_at)`
- Auto-created on first API hit via shared `ensureDatabase()` in [`lib/db.ts`](/home/worker/repo/lib/db.ts)
- `DATABASE_URL` is set as a protected env var on Vercel
- Cache key is `sha256(normalized_url + "::" + normalized_niche_notes)` and reuses kits for 90 days

## Payment
- Stripe product: "Sponza Sponsorship Kit" — $29 one-time
- Stripe product: "Sponza Kit Refresh" — $19 one-time
- Shared payment link: https://buy.stripe.com/aFaeVe3He16v6iC2SneP03g
- Legacy product removed: "Sponza Complete Sponsorship Kit" — $29 one-time
- After payment → redirect to `/checkout/success`
- Webhook at `/api/webhooks/nanocorp` receives `checkout.session.completed`
- Webhook now stores a `payment_unlocks` row keyed by lowercase email and marks any matching cached kits as `paid_at`

## Recent Changes
- 2026-04-20: Built `/api/generate-kit` as the core AI sponsorship-kit pipeline with 90-day Neon caching, free/paid output gating, and a single GPT-4o structured JSON call.
- 2026-04-20: Added shared backend modules in [`lib/db.ts`](/home/worker/repo/lib/db.ts), [`lib/sponza/utils.ts`](/home/worker/repo/lib/sponza/utils.ts), [`lib/sponza/scrape.ts`](/home/worker/repo/lib/sponza/scrape.ts), [`lib/sponza/llm.ts`](/home/worker/repo/lib/sponza/llm.ts), and [`lib/sponza/service.ts`](/home/worker/repo/lib/sponza/service.ts).
- 2026-04-20: Extended [`app/api/webhooks/nanocorp/route.ts`](/home/worker/repo/app/api/webhooks/nanocorp/route.ts) to persist payment unlocks, and updated [`app/api/submit/route.ts`](/home/worker/repo/app/api/submit/route.ts) to use shared DB/platform helpers plus `niche_notes`.
- 2026-04-20: Verified `npm run lint` and `npm run build` both pass after the pipeline changes.
- 2026-04-20: Ran a local API sanity test by seeding a cached kit row, confirming `/api/generate-kit` returns the free gated payload before payment, then posting a mock NanoCorp webhook and confirming the same request returns the full paid payload from cache.
- 2026-04-20: Created Stripe products `Sponza Sponsorship Kit` ($29 one-time) and `Sponza Kit Refresh` ($19 one-time) with full descriptions via `nanocorp products create`.
- 2026-04-20: Deactivated legacy Stripe product `Sponza Complete Sponsorship Kit` so the shared payment link only exposes the intended paid tiers.
- 2026-04-20: Confirmed the active NanoCorp catalog contains exactly the two requested products and that NanoCorp issued a new active payment link URL.
- 2026-04-20: Attempted browser-level verification of the Stripe checkout page with `agent-browser`, but the local environment does not have a Chrome binary installed, so checkout-page rendering was not visually verified.

## Sponsorship Kit Pipeline
- Input: `{ url, email, niche_notes? }`
- Supported platforms: YouTube, Instagram, TikTok
- YouTube path: resolves a channel from channel/video/handle URLs, fetches channel stats via YouTube Data API v3, loads recent uploads, estimates avg views and engagement, and passes recent title themes into the prompt.
- Instagram/TikTok path: tries public oEmbed first, then falls back to public page metadata scraping; TikTok also tries `yt-dlp` if available at runtime.
- Failure behavior: scraping degrades to URL + niche notes only; LLM errors return `We couldn't analyze this URL — try again or paste a different URL`; all failures are logged to `kit_failures`.
- Free response: readiness score/label/insights, full creator profile, rate-card range only, first 3 brand matches plus remaining count, first pitch email truncated to 100 chars, media-kit summary, and `last_analyzed`.
- Paid response: full stored kit JSON plus `last_analyzed`.

## Environment Notes
- Local shell currently has `DATABASE_URL` set.
- Local shell currently does **not** have `OPENAI_API_KEY` or `YOUTUBE_API_KEY` set, so live LLM and live YouTube scrape execution were not exercised end-to-end in this session.

## Results Page (Mock Data)
Currently shows hardcoded data for a beauty/lifestyle YouTube creator:
- 45,200 subscribers, 6.2% engagement, 18,400 avg views
- Score: 74/100 — "Strong Potential"
- 3 visible brand matches (Versed Skincare, OLIPOP, Parade)
- 24 blurred brand cards with unlock CTA
- Pitch email preview (first 3 paragraphs visible, rest blurred)
- Rate card teaser ($650–$1,400/post range shown, table blurred)
- PDF kit mock thumbnail with watermark overlay

## Next Steps (Follow-up Tasks)
1. **Results page wiring** — replace the hardcoded `/results` mock data with a real client flow that POSTs to `/api/generate-kit`, handles loading/errors, and displays `last_analyzed`.
2. **Checkout-to-kit continuity** — tie the payment flow to a specific generated kit more explicitly than email-only unlocking, ideally by passing a kit identifier through checkout metadata once NanoCorp exposes it.
3. **PDF generation** — generate and store the paid PDF kit after webhook confirmation, then expose download/delivery UX.
4. **Env setup** — set `OPENAI_API_KEY` and `YOUTUBE_API_KEY` in Vercel and confirm live scrape + GPT execution against real creator URLs.
5. **Brand/contact QA** — add a review layer or heuristics for brand contact routes so paid kits avoid weak or stale contact details.
