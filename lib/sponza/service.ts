import { getPool } from "@/lib/db";
import { generateSponsorshipKit } from "@/lib/sponza/llm";
import { buildFallbackScrape, scrapeCreator } from "@/lib/sponza/scrape";
import type {
  FreeSponsorshipKitPreview,
  GenerateKitInput,
  GenerateKitResponse,
  KitRecord,
  SponsorshipKit,
} from "@/lib/sponza/types";
import {
  detectPlatform,
  hashValue,
  normalizeEmail,
  normalizeNicheNotes,
  normalizeUrl,
} from "@/lib/sponza/utils";

const CACHE_WINDOW_DAYS = 90;

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

async function getCachedKit(cacheKey: string): Promise<KitRecord | null> {
  const db = getPool();
  const result = await db.query<KitRecord>(
    `
      SELECT
        id,
        platform,
        email,
        url,
        normalized_url,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        full_kit_json,
        scrape_json
      FROM sponsorship_kits
      WHERE cache_key = $1
        AND created_at >= NOW() - INTERVAL '${CACHE_WINDOW_DAYS} days'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [cacheKey]
  );

  return result.rows[0] || null;
}

async function hasPaidUnlock(email: string | null) {
  if (!email) {
    return false;
  }

  const db = getPool();
  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM payment_unlocks
        WHERE email = $1
      ) AS exists
    `,
    [email]
  );

  return result.rows[0]?.exists || false;
}

async function saveKitRecord(params: {
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
  isPaid: boolean;
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
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, NOW(), NOW())
      ON CONFLICT (cache_key)
      DO UPDATE SET
        url = EXCLUDED.url,
        normalized_url = EXCLUDED.normalized_url,
        url_hash = EXCLUDED.url_hash,
        niche_notes = EXCLUDED.niche_notes,
        niche_hash = EXCLUDED.niche_hash,
        platform = EXCLUDED.platform,
        email = COALESCE(EXCLUDED.email, sponsorship_kits.email),
        scrape_json = EXCLUDED.scrape_json,
        full_kit_json = EXCLUDED.full_kit_json,
        paid_at = COALESCE(sponsorship_kits.paid_at, EXCLUDED.paid_at),
        pack_ready_at = NULL,
        pack_last_error = NULL,
        created_at = NOW(),
        updated_at = NOW()
      RETURNING
        id,
        platform,
        email,
        url,
        normalized_url,
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
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
      params.isPaid ? new Date().toISOString() : null,
    ]
  );

  return result.rows[0];
}

function withResponseMeta<T extends object>(
  payload: T,
  kitId: number,
  accessTier: "free" | "paid",
  createdAt: string,
  cached: boolean,
  packReadyAt: string | null
): GenerateKitResponse {
  return {
    ...payload,
    kit_id: kitId,
    access_tier: accessTier,
    cached,
    last_analyzed: createdAt,
    download_ready: accessTier === "paid",
    pack_ready_at: packReadyAt,
  } as unknown as GenerateKitResponse;
}

export async function generateKitResponse(input: GenerateKitInput) {
  const normalizedUrl = normalizeUrl(input.url);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedNiche = normalizeNicheNotes(input.niche_notes);
  const platform = detectPlatform(normalizedUrl);
  const urlHash = hashValue(normalizedUrl);
  const nicheHash = hashValue(normalizedNiche);
  const cacheKey = hashValue(`${normalizedUrl}::${normalizedNiche}`);

  await recordSubmission(normalizedUrl, normalizedEmail, platform, input.niche_notes);

  const paidUnlock = await hasPaidUnlock(normalizedEmail);
  const cachedKit = await getCachedKit(cacheKey);

  if (cachedKit) {
    const payload = paidUnlock
      ? cachedKit.full_kit_json
      : buildFreeResponse(cachedKit.full_kit_json);

    return withResponseMeta(
      payload,
      cachedKit.id,
      paidUnlock ? "paid" : "free",
      cachedKit.created_at,
      true,
      cachedKit.pack_ready_at
    );
  }

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

  const savedRecord = await saveKitRecord({
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
    isPaid: paidUnlock,
  });

  const payload = paidUnlock ? fullKit : buildFreeResponse(fullKit);
  return withResponseMeta(
    payload,
    savedRecord.id,
    paidUnlock ? "paid" : "free",
    savedRecord.created_at,
    false,
    savedRecord.pack_ready_at
  );
}

export async function recordPaymentUnlock(params: {
  email?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  stripe_session_id?: string | null;
}) {
  const email = normalizeEmail(params.email);

  if (!email) {
    return false;
  }

  const db = getPool();

  await db.query(
    `
      INSERT INTO payment_unlocks (email, amount_cents, currency, stripe_session_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        amount_cents = COALESCE(EXCLUDED.amount_cents, payment_unlocks.amount_cents),
        currency = COALESCE(EXCLUDED.currency, payment_unlocks.currency),
        stripe_session_id = COALESCE(EXCLUDED.stripe_session_id, payment_unlocks.stripe_session_id),
        updated_at = NOW()
    `,
    [email, params.amount_cents || null, params.currency || null, params.stripe_session_id || null]
  );

  await db.query(
    `
      UPDATE sponsorship_kits
      SET paid_at = NOW(), updated_at = NOW()
      WHERE LOWER(email) = LOWER($1)
    `,
    [email]
  );

  return true;
}

async function markKitPaid(kitId: number) {
  const db = getPool();
  await db.query(
    `
      UPDATE sponsorship_kits
      SET paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
      WHERE id = $1
    `,
    [kitId]
  );
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
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
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

export async function getPaidKitRecordById(kitId: number) {
  const kit = await getKitRecordById(kitId);

  if (!kit) {
    return null;
  }

  const unlocked = kit.paid_at !== null || (await hasPaidUnlock(kit.email));

  if (!unlocked) {
    return null;
  }

  if (!kit.paid_at) {
    await markKitPaid(kit.id);
    kit.paid_at = new Date().toISOString();
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
        created_at::text,
        paid_at::text,
        pack_ready_at::text,
        pack_last_error,
        full_kit_json,
        scrape_json
      FROM sponsorship_kits
      WHERE LOWER(email) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [normalizedEmail]
  );

  const kit = result.rows[0] || null;

  if (!kit) {
    return null;
  }

  if (!kit.paid_at) {
    const unlocked = await hasPaidUnlock(normalizedEmail);

    if (!unlocked) {
      return null;
    }

    await markKitPaid(kit.id);
    kit.paid_at = new Date().toISOString();
  }

  return kit;
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
