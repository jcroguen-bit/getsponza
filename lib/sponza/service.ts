import { getPool } from "@/lib/db";
import {
  FULL_KIT_PRICE_CENTS,
  getPurchasePriceCents,
  getPurchaseType,
  getRefreshAvailableAt,
  isRefreshEligible,
  REFRESH_WINDOW_DAYS,
} from "@/lib/sponza/commerce";
import { generateSponsorshipKit } from "@/lib/sponza/llm";
import { buildFallbackScrape, scrapeCreator } from "@/lib/sponza/scrape";
import type {
  FreeSponsorshipKitPreview,
  GenerateKitInput,
  GenerateKitResponse,
  KitRecord,
  PurchaseType,
  SponsorshipKit,
} from "@/lib/sponza/types";
import {
  detectPlatform,
  hashValue,
  normalizeEmail,
  normalizeNicheNotes,
  normalizeUrl,
} from "@/lib/sponza/utils";

const CACHE_WINDOW_SQL = `${REFRESH_WINDOW_DAYS} days`;

function buildFreeResponse(kit: SponsorshipKit): FreeSponsorshipKitPreview {
  const firstPitch = kit.pitch_emails[0];

  return {
    readiness_score: kit.readiness_score,
    readiness_label: kit.readiness_label,
    readiness_insights: kit.readiness_insights,
    creator_profile: kit.creator_profile,
    rate_card: {
      range_low: kit.rate_card.range_low,
      range_high: kit.rate_card.range_high,
    },
    brand_matches: kit.brand_matches.slice(0, 3),
    brand_matches_remaining: Math.max(kit.brand_matches.length - 3, 0),
    pitch_emails: firstPitch
      ? [
          {
            brand: firstPitch.brand,
            subject: firstPitch.subject,
            body: firstPitch.body.slice(0, 100),
          },
        ]
      : [],
    media_kit_summary: kit.media_kit_summary,
  };
}

function toKitResponse(params: {
  kit: KitRecord;
  accessTier: "free" | "paid";
  cached: boolean;
}): GenerateKitResponse {
  const payload =
    params.accessTier === "paid"
      ? params.kit.full_kit_json
      : buildFreeResponse(params.kit.full_kit_json);

  return {
    ...payload,
    kit_id: params.kit.id,
    email: params.kit.email,
    access_tier: params.accessTier,
    cached: params.cached,
    last_analyzed: params.kit.created_at,
    download_ready: params.accessTier === "paid",
    pack_ready_at: params.kit.pack_ready_at,
    refresh_eligible: isRefreshEligible(params.kit.created_at),
    refresh_available_at: getRefreshAvailableAt(params.kit.created_at),
    purchase_type: getPurchaseType(params.kit.refresh_source_kit_id),
    purchase_price_cents: getPurchasePriceCents(params.kit.refresh_source_kit_id),
  } as GenerateKitResponse;
}

function getKitPurchaseType(record: KitRecord): PurchaseType {
  return getPurchaseType(record.refresh_source_kit_id);
}

async function recordSubmission(url: string, email: string | null, platform: string, nicheNotes?: string) {
  const db = getPool();
  await db.query(
    `
      INSERT INTO submissions (url, email, platform, niche_notes)
      VALUES ($1, $2, $3, $4)
    `,
    [url, email, platform, nicheNotes || null]
  );
}

export async function logKitFailure(
  step: string,
  input: Partial<GenerateKitInput> & {
    platform?: string;
    cacheKey?: string;
    details?: Record<string, unknown>;
    error: unknown;
  }
) {
  try {
    const db = getPool();
    await db.query(
      `
        INSERT INTO kit_failures (url, email, platform, cache_key, step, error_message, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        input.url || null,
        normalizeEmail(input.email),
        input.platform || null,
        input.cacheKey || null,
        step,
        input.error instanceof Error ? input.error.message : String(input.error),
        JSON.stringify(input.details || {}),
      ]
    );
  } catch (loggingError) {
    console.error("Failed to log kit failure", loggingError);
  }
}

async function getCachedKit(cacheKey: string) {
  const db = getPool();
  const result = await db.query<KitRecord>(
    `
      SELECT
        id,
        platform,
        email,
        url,
        normalized_url,
        niche_notes,
        cache_key,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        stripe_payment_id,
        stripe_checkout_session_id,
        refresh_source_kit_id,
        full_kit_json,
        scrape_json
      FROM sponsorship_kits
      WHERE cache_key = $1
        AND created_at >= NOW() - INTERVAL '${CACHE_WINDOW_SQL}'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [cacheKey]
  );

  return result.rows[0] || null;
}

async function insertKitRecord(params: {
  url: string;
  email: string | null;
  platform: string;
  normalizedUrl: string;
  urlHash: string;
  nicheNotes: string;
  nicheHash: string;
  cacheKey: string;
  scrapeJson: Record<string, unknown>;
  fullKit: SponsorshipKit;
  paidAt?: string | null;
  refreshSourceKitId?: number | null;
}) {
  const db = getPool();
  const result = await db.query<KitRecord>(
    `
      INSERT INTO sponsorship_kits (
        url,
        normalized_url,
        url_hash,
        niche_notes,
        niche_hash,
        cache_key,
        platform,
        email,
        scrape_json,
        full_kit_json,
        paid_at,
        refresh_source_kit_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, NOW(), NOW())
      RETURNING
        id,
        platform,
        email,
        url,
        normalized_url,
        niche_notes,
        cache_key,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        stripe_payment_id,
        stripe_checkout_session_id,
        refresh_source_kit_id,
        full_kit_json,
        scrape_json
    `,
    [
      params.url,
      params.normalizedUrl,
      params.urlHash,
      params.nicheNotes || null,
      params.nicheHash,
      params.cacheKey,
      params.platform,
      params.email,
      JSON.stringify(params.scrapeJson),
      JSON.stringify(params.fullKit),
      params.paidAt || null,
      params.refreshSourceKitId || null,
    ]
  );

  return result.rows[0];
}

async function buildAndStoreKit(
  input: GenerateKitInput,
  options?: {
    refreshSourceKitId?: number | null;
    paidAt?: string | null;
  }
) {
  const normalizedUrl = normalizeUrl(input.url);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedNiche = normalizeNicheNotes(input.niche_notes);
  const platform = detectPlatform(normalizedUrl);
  const urlHash = hashValue(normalizedUrl);
  const nicheHash = hashValue(normalizedNiche);
  const cacheKey = hashValue(`${normalizedUrl}::${normalizedNiche}`);

  let scrapeResult;
  try {
    scrapeResult = await scrapeCreator(normalizedUrl, input.niche_notes);
  } catch (error) {
    await logKitFailure("scrape", {
      url: normalizedUrl,
      email: normalizedEmail || undefined,
      platform,
      cacheKey,
      error,
    });
    scrapeResult = buildFallbackScrape(normalizedUrl, platform, input.niche_notes, [
      "Scraping failed, so the research team used the URL and niche notes only.",
    ]);
  }

  let fullKit: SponsorshipKit;
  try {
    fullKit = await generateSponsorshipKit(
      {
        ...input,
        url: normalizedUrl,
        email: normalizedEmail || undefined,
      },
      scrapeResult
    );
  } catch (error) {
    await logKitFailure("llm", {
      url: normalizedUrl,
      email: normalizedEmail || undefined,
      platform,
      cacheKey,
      error,
      details: {
        scrape_quality: scrapeResult.scrape_quality,
        scrape_notes: scrapeResult.source_notes,
      },
    });
    throw error;
  }

  const record = await insertKitRecord({
    url: normalizedUrl,
    email: normalizedEmail,
    platform,
    normalizedUrl,
    urlHash,
    nicheNotes: input.niche_notes || "",
    nicheHash,
    cacheKey,
    scrapeJson: scrapeResult as unknown as Record<string, unknown>,
    fullKit,
    paidAt: options?.paidAt || null,
    refreshSourceKitId: options?.refreshSourceKitId || null,
  });

  return { record, cacheKey, platform };
}

function canUnlockPaidKitForGenerateRequest(kit: KitRecord, email: string | null) {
  if (!kit.paid_at) {
    return false;
  }

  return normalizeEmail(kit.email) !== null && normalizeEmail(kit.email) === email;
}

export async function generateKitResponse(input: GenerateKitInput) {
  const normalizedUrl = normalizeUrl(input.url);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedNiche = normalizeNicheNotes(input.niche_notes);
  const platform = detectPlatform(normalizedUrl);
  const cacheKey = hashValue(`${normalizedUrl}::${normalizedNiche}`);

  await recordSubmission(normalizedUrl, normalizedEmail, platform, input.niche_notes);

  const cachedKit = await getCachedKit(cacheKey);

  if (cachedKit) {
    const accessTier = canUnlockPaidKitForGenerateRequest(cachedKit, normalizedEmail) ? "paid" : "free";
    return toKitResponse({ kit: cachedKit, accessTier, cached: true });
  }

  const { record } = await buildAndStoreKit({
    ...input,
    url: normalizedUrl,
    email: normalizedEmail || undefined,
    niche_notes: input.niche_notes,
  });

  return toKitResponse({ kit: record, accessTier: "free", cached: false });
}

export async function getKitRecordById(kitId: number) {
  const db = getPool();
  const result = await db.query<KitRecord>(
    `
      SELECT
        id,
        platform,
        email,
        url,
        normalized_url,
        niche_notes,
        cache_key,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        stripe_payment_id,
        stripe_checkout_session_id,
        refresh_source_kit_id,
        full_kit_json,
        scrape_json
      FROM sponsorship_kits
      WHERE id = $1
      LIMIT 1
    `,
    [kitId]
  );

  return result.rows[0] || null;
}

async function markKitPaid(params: {
  kitId: number;
  email?: string | null;
  stripePaymentId?: string | null;
  stripeCheckoutSessionId?: string | null;
}) {
  const db = getPool();
  const result = await db.query<KitRecord>(
    `
      UPDATE sponsorship_kits
      SET
        email = COALESCE($2, email),
        paid_at = COALESCE(paid_at, NOW()),
        stripe_payment_id = COALESCE($3, stripe_payment_id),
        stripe_checkout_session_id = COALESCE($4, stripe_checkout_session_id),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        platform,
        email,
        url,
        normalized_url,
        niche_notes,
        cache_key,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        stripe_payment_id,
        stripe_checkout_session_id,
        refresh_source_kit_id,
        full_kit_json,
        scrape_json
    `,
    [
      params.kitId,
      normalizeEmail(params.email),
      params.stripePaymentId || null,
      params.stripeCheckoutSessionId || null,
    ]
  );

  return result.rows[0] || null;
}

export async function updateKitEmail(kitId: number, email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("A valid email is required");
  }

  const db = getPool();
  await db.query(
    `
      UPDATE sponsorship_kits
      SET email = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [kitId, normalizedEmail]
  );
}

export async function getKitResponseById(kitId: number) {
  const kit = await getKitRecordById(kitId);

  if (!kit) {
    return null;
  }

  return toKitResponse({
    kit,
    accessTier: kit.paid_at ? "paid" : "free",
    cached: true,
  });
}

export async function getPaidKitRecordById(kitId: number) {
  const kit = await getKitRecordById(kitId);

  if (!kit || !kit.paid_at) {
    return null;
  }

  return kit;
}

export async function getLatestPaidKitForEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const db = getPool();
  const result = await db.query<KitRecord>(
    `
      SELECT
        id,
        platform,
        email,
        url,
        normalized_url,
        niche_notes,
        cache_key,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        stripe_payment_id,
        stripe_checkout_session_id,
        refresh_source_kit_id,
        full_kit_json,
        scrape_json
      FROM sponsorship_kits
      WHERE LOWER(email) = LOWER($1)
        AND paid_at IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return result.rows[0] || null;
}

export async function getCheckoutKitById(kitId: number) {
  const kit = await getKitRecordById(kitId);

  if (!kit) {
    return null;
  }

  return {
    ...kit,
    purchase_type: getKitPurchaseType(kit),
    purchase_price_cents: getPurchasePriceCents(kit.refresh_source_kit_id),
  };
}

export async function recordStripeCheckoutCompletion(params: {
  kitId: number;
  email?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  stripeSessionId?: string | null;
  stripePaymentId?: string | null;
}) {
  const normalizedEmail = normalizeEmail(params.email);
  const paidKit = await markKitPaid({
    kitId: params.kitId,
    email: normalizedEmail,
    stripePaymentId: params.stripePaymentId,
    stripeCheckoutSessionId: params.stripeSessionId,
  });

  if (!paidKit) {
    return null;
  }

  const db = getPool();
  await db.query(
    `
      INSERT INTO payment_unlocks (
        kit_id,
        email,
        amount_cents,
        currency,
        stripe_session_id,
        stripe_payment_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `,
    [
      paidKit.id,
      normalizedEmail || paidKit.email || "unknown@example.com",
      params.amountCents || getPurchasePriceCents(paidKit.refresh_source_kit_id),
      params.currency || "usd",
      params.stripeSessionId || null,
      params.stripePaymentId || null,
    ]
  );

  return paidKit;
}

export async function recordPaymentUnlock(params: {
  email?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  stripe_session_id?: string | null;
}) {
  const normalizedEmail = normalizeEmail(params.email);

  if (!normalizedEmail) {
    return false;
  }

  const db = getPool();
  await db.query(
    `
      INSERT INTO payment_unlocks (email, amount_cents, currency, stripe_session_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `,
    [normalizedEmail, params.amount_cents || FULL_KIT_PRICE_CENTS, params.currency || "usd", params.stripe_session_id || null]
  );

  await db.query(
    `
      UPDATE sponsorship_kits
      SET paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
      WHERE LOWER(email) = LOWER($1)
        AND paid_at IS NULL
    `,
    [normalizedEmail]
  );

  return true;
}

export async function createRefreshKit(sourceKitId: number) {
  const sourceKit = await getKitRecordById(sourceKitId);

  if (!sourceKit) {
    throw new Error("Original kit not found");
  }

  if (!sourceKit.paid_at) {
    throw new Error("Only paid kits can be refreshed");
  }

  if (!isRefreshEligible(sourceKit.created_at)) {
    throw new Error("Refresh is only available 90 days after the original kit");
  }

  const { record } = await buildAndStoreKit(
    {
      url: sourceKit.url,
      email: sourceKit.email || undefined,
      niche_notes: sourceKit.niche_notes || undefined,
    },
    {
      refreshSourceKitId: sourceKit.id,
    }
  );

  return toKitResponse({
    kit: record,
    accessTier: "free",
    cached: false,
  });
}

export async function updateKitPackStatus(params: {
  kitId: number;
  ready: boolean;
  error?: string | null;
}) {
  const db = getPool();

  await db.query(
    `
      UPDATE sponsorship_kits
      SET
        pack_ready_at = CASE WHEN $2 THEN NOW() ELSE pack_ready_at END,
        pack_last_error = CASE WHEN $2 THEN NULL ELSE $3 END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [params.kitId, params.ready, params.error || null]
  );
}
