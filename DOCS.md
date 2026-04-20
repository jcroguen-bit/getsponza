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
  api/submit/route.ts     — POST endpoint — stores URL submission in Neon DB
  api/webhooks/nanocorp/route.ts — Stripe webhook handler (checkout.session.completed)
  checkout/success/page.tsx — Post-payment thank-you page
```

## Design System
- **Colors**: `--navy: #0F1B2D`, `--warm-white: #FAFAF8`, `--gold: #F5A623`
- **Typography**: Playfair Display (display/headings) + DM Sans (body)
- **Font class**: `.font-display` → `font-family: 'Playfair Display', serif`

## Database
- Table: `submissions (id, url, email, platform, created_at)`
- Auto-created on first submission via `CREATE TABLE IF NOT EXISTS`
- `DATABASE_URL` is set as a protected env var on Vercel

## Payment
- Stripe product: "Sponza Sponsorship Kit" — $29 one-time
- Stripe product: "Sponza Kit Refresh" — $19 one-time
- Shared payment link: https://buy.stripe.com/aFaeVe3He16v6iC2SneP03g
- Legacy product removed: "Sponza Complete Sponsorship Kit" — $29 one-time
- After payment → redirect to `/checkout/success`
- Webhook at `/api/webhooks/nanocorp` receives `checkout.session.completed`

## Recent Changes
- 2026-04-20: Created Stripe products `Sponza Sponsorship Kit` ($29 one-time) and `Sponza Kit Refresh` ($19 one-time) with full descriptions via `nanocorp products create`.
- 2026-04-20: Deactivated legacy Stripe product `Sponza Complete Sponsorship Kit` so the shared payment link only exposes the intended paid tiers.
- 2026-04-20: Confirmed the active NanoCorp catalog contains exactly the two requested products and that NanoCorp issued a new active payment link URL.
- 2026-04-20: Attempted browser-level verification of the Stripe checkout page with `agent-browser`, but the local environment does not have a Chrome binary installed, so checkout-page rendering was not visually verified.

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
1. **Real AI pipeline** — connect URL to scraping + GPT analysis, replace mock data
2. **Platform detection** — parse YouTube/Instagram/TikTok URLs, pull real stats via API
3. **Kit delivery** — generate real PDF media kit, pitch emails on payment
4. **Email capture** — add optional email field before results unlock
5. **Admin dashboard** — view/export submissions from Neon DB
