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
  page.tsx                — Landing page (Hero, How It Works, Features, Testimonials, FAQ, Footer) with optional email + niche capture for paid-unlock continuity
  results/page.tsx        — Suspense wrapper for the live results experience
  results/results-client.tsx — Client results app that fetches `/api/generate-kit`, polls for payment unlocks, and downloads the paid sponsorship pack ZIP
  api/generate-kit/route.ts — POST endpoint — scrape, cache, gate, and return sponsorship kit output
  api/generate-pdf/route.ts — POST endpoint — returns the designed paid media kit PDF for a `kit_id`
  api/download-pack/route.ts — POST endpoint — returns the paid sponsorship-pack ZIP (`media_kit.pdf`, `pitch_emails.txt`, `brand_list.csv`)
  api/submit/route.ts     — POST endpoint — stores URL submission in Neon DB
  api/webhooks/nanocorp/route.ts — Stripe webhook handler (checkout.session.completed) that now primes the paid sponsorship pack
  checkout/success/page.tsx — Post-payment thank-you page with instructions to return to the results page for download
lib/
  db.ts                   — Shared Neon `pg` pool + table bootstrap for submissions, kits, unlocks, failures
  sponza/utils.ts         — URL normalization, platform detection, hashing, parsing helpers
  sponza/scrape.ts        — YouTube API scraper + Instagram/TikTok public metadata fallbacks
  sponza/llm.ts           — Single GPT-4o JSON-schema prompt for full sponsorship kit generation
  sponza/service.ts       — Cache lookup, free/paid gating, failure logging, payment unlock persistence
  sponza/deliverables.tsx — Server-side PDF rendering and sponsorship-pack ZIP assembly
```

## Design System
- **Colors**: `--navy: #0F1B2D`, `--warm-white: #FAFAF8`, `--gold: #F5A623`
- **Typography**: Playfair Display (display/headings) + DM Sans (body)
- **Font class**: `.font-display` → `font-family: 'Playfair Display', serif`

## Database
- Table: `submissions (id, url, email, platform, created_at)`
- Table: `sponsorship_kits (url_hash, niche_hash, cache_key, platform, full_kit_json, scrape_json, email, paid_at, pack_ready_at, pack_last_error, created_at, updated_at)`
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
- 2026-04-20: Audit for paid sponsorship-pack delivery found that the backend currently stops at JSON kit generation; there is no downloadable PDF/ZIP artifact route yet, the webhook only records unlocks, and [`app/results/page.tsx`](/home/worker/repo/app/results/page.tsx) is still hardcoded mock UI rather than rendering `/api/generate-kit` responses.
- 2026-04-20: Installed project dependencies plus `@react-pdf/renderer` and `jszip`, then read the local Next 16 App Router docs at [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`](/home/worker/repo/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md) and [`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`](/home/worker/repo/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md) before implementing new route handlers and client-side query-param usage.
- 2026-04-20: Built paid deliverable generation with [`lib/sponza/deliverables.tsx`](/home/worker/repo/lib/sponza/deliverables.tsx), including a professionally styled media-kit PDF and a ZIP bundle containing `media_kit.pdf`, `pitch_emails.txt`, and `brand_list.csv`.
- 2026-04-20: Added new Node runtime endpoints [`app/api/generate-pdf/route.ts`](/home/worker/repo/app/api/generate-pdf/route.ts) and [`app/api/download-pack/route.ts`](/home/worker/repo/app/api/download-pack/route.ts), plus pack-status tracking columns on `sponsorship_kits`.
- 2026-04-20: Extended [`lib/sponza/service.ts`](/home/worker/repo/lib/sponza/service.ts) to return `kit_id`, `download_ready`, and `pack_ready_at` in `/api/generate-kit` responses and to expose paid-kit lookup helpers for download routes and webhook processing.
- 2026-04-20: Replaced the mock results page with a live client flow in [`app/results/results-client.tsx`](/home/worker/repo/app/results/results-client.tsx) that fetches `/api/generate-kit`, polls for webhook-based unlocks, pre-fills Stripe checkout with the creator email, and shows a single `Download Your Sponsorship Pack` button for paid kits.
- 2026-04-20: Updated the landing-page hero form in [`app/page.tsx`](/home/worker/repo/app/page.tsx) to capture optional email and niche notes, and corrected the hardcoded NanoCorp payment link to the current active URL `https://buy.stripe.com/aFaeVe3He16v6iC2SneP03g`.
- 2026-04-20: Updated [`app/api/webhooks/nanocorp/route.ts`](/home/worker/repo/app/api/webhooks/nanocorp/route.ts) to prime the sponsorship pack after `checkout.session.completed`, marking `pack_ready_at` on success and recording failures on the kit row if generation fails.
- 2026-04-20: Verified `npm run lint` and `npm run build` pass after the sponsorship-pack changes.
- 2026-04-20: Ran a local end-to-end sanity test by seeding a paid `sponsorship_kits` row, starting the built app locally, confirming `POST /api/generate-pdf` returns `200` with `Content-Type: application/pdf`, confirming `POST /api/download-pack` returns `200` with `Content-Type: application/zip`, and verifying the ZIP contains exactly `media_kit.pdf`, `pitch_emails.txt`, and `brand_list.csv`.
- 2026-04-20: Installed Chrome via `agent-browser install` and used `agent-browser` to open the local `/results` page for a seeded paid kit, confirming the live UI renders the sponsorship report plus the `Download Your Sponsorship Pack` buttons.

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

## Results Page
- Loads `url`, `email`, and `niche` from query params and POSTs to `/api/generate-kit`
- Shows live creator profile stats, readiness insights, brand matches, rate card, and pitch-email preview from the returned kit JSON
- If an email is present and the kit is still free, polls `/api/generate-kit` every 12 seconds so the page unlocks shortly after the payment webhook lands
- If the kit is paid, shows a single `Download Your Sponsorship Pack` button that downloads the ZIP from `/api/download-pack`
- If no email is present, prompts the creator to add one on the results page before checkout so the Stripe email can unlock the paid pack automatically

## Next Steps (Follow-up Tasks)
1. **Checkout-to-kit continuity** — replace email-only unlock matching with a stronger kit identifier or checkout metadata once NanoCorp exposes it, so creators can download without relying on the same email in both places.
2. **Artifact persistence** — decide whether paid packs should remain on-demand only or be stored in Blob storage with signed URLs for faster repeat downloads and support workflows.
3. **Live data QA** — set `OPENAI_API_KEY` and `YOUTUBE_API_KEY` in Vercel, then test the full flow against real creator URLs instead of seeded DB rows.
4. **Results UX refinement** — add richer loading/error states, success-page deep linking back to the analyzed kit, and a clearer post-payment recovery path if the creator closes the original results tab.
5. **Brand/contact QA** — add stronger validation or manual review heuristics for `contact_route`, `contact_detail`, and `last_verified` so the paid CSV stays trustworthy at scale.
