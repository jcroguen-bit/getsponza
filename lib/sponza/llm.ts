import type { GenerateKitInput, ScrapeResult, SponsorshipKit } from "@/lib/sponza/types";
import { formatPercent, formatPlatform } from "@/lib/sponza/utils";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const KIT_SCHEMA = {
  name: "sponsorship_kit",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "readiness_score",
      "readiness_label",
      "readiness_insights",
      "creator_profile",
      "rate_card",
      "brand_matches",
      "pitch_emails",
      "media_kit_summary",
    ],
    properties: {
      readiness_score: { type: "integer", minimum: 1, maximum: 100 },
      readiness_label: { type: "string" },
      readiness_insights: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string" },
      },
      creator_profile: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "platform",
          "niche",
          "followers",
          "avg_views",
          "engagement_rate",
          "audience_age",
          "audience_gender",
          "content_style",
          "posting_frequency",
        ],
        properties: {
          name: { type: "string" },
          platform: { type: "string" },
          niche: { type: "string" },
          followers: { type: "integer", minimum: 0 },
          avg_views: { type: "integer", minimum: 0 },
          engagement_rate: { type: "string" },
          audience_age: { type: "string" },
          audience_gender: { type: "string" },
          content_style: { type: "string" },
          posting_frequency: { type: "string" },
        },
      },
      rate_card: {
        type: "object",
        additionalProperties: false,
        required: ["range_low", "range_high", "currency", "per", "breakdown"],
        properties: {
          range_low: { type: "integer", minimum: 0 },
          range_high: { type: "integer", minimum: 0 },
          currency: { type: "string" },
          per: { type: "string" },
          breakdown: {
            type: "object",
            additionalProperties: false,
            required: ["integration_30s", "dedicated_video", "instagram_story"],
            properties: {
              integration_30s: { type: "string" },
              dedicated_video: { type: "string" },
              instagram_story: { type: "string" },
            },
          },
        },
      },
      brand_matches: {
        type: "array",
        minItems: 25,
        maxItems: 25,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "brand",
            "category",
            "tier",
            "why_match",
            "contact_route",
            "contact_detail",
            "last_verified",
          ],
          properties: {
            brand: { type: "string" },
            category: { type: "string" },
            tier: { type: "string" },
            why_match: { type: "string" },
            contact_route: { type: "string" },
            contact_detail: { type: "string" },
            last_verified: { type: "string" },
          },
        },
      },
      pitch_emails: {
        type: "array",
        minItems: 8,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["brand", "subject", "body"],
          properties: {
            brand: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
          },
        },
      },
      media_kit_summary: { type: "string" },
    },
  },
} as const;

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is missing`);
  }

  return value.trim();
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} is missing`);
  }

  return Math.round(value);
}

function parseChatMessageContent(message: unknown) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const messageObject = message as {
    refusal?: string;
    content?: string | Array<{ type?: string; text?: string }>;
  };

  if (messageObject.refusal) {
    throw new Error(messageObject.refusal);
  }

  if (typeof messageObject.content === "string") {
    return messageObject.content;
  }

  if (Array.isArray(messageObject.content)) {
    const textPart = messageObject.content.find((part) => part.type === "text");
    return textPart?.text || null;
  }

  return null;
}

function coerceKitShape(parsed: unknown): SponsorshipKit {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Structured kit payload was empty");
  }

  const root = parsed as Record<string, unknown>;
  const creatorProfile = root.creator_profile as Record<string, unknown>;
  const rateCard = root.rate_card as Record<string, unknown>;
  const breakdown = rateCard?.breakdown as Record<string, unknown>;

  if (!creatorProfile || !rateCard || !breakdown) {
    throw new Error("Structured kit payload was incomplete");
  }

  return {
    readiness_score: assertNumber(root.readiness_score, "readiness_score"),
    readiness_label: assertString(root.readiness_label, "readiness_label"),
    readiness_insights: Array.isArray(root.readiness_insights)
      ? root.readiness_insights.map((item, index) => assertString(item, `readiness_insights[${index}]`)).slice(0, 3)
      : (() => {
          throw new Error("readiness_insights is missing");
        })(),
    creator_profile: {
      name: assertString(creatorProfile.name, "creator_profile.name"),
      platform: assertString(creatorProfile.platform, "creator_profile.platform"),
      niche: assertString(creatorProfile.niche, "creator_profile.niche"),
      followers: assertNumber(creatorProfile.followers, "creator_profile.followers"),
      avg_views: assertNumber(creatorProfile.avg_views, "creator_profile.avg_views"),
      engagement_rate: assertString(creatorProfile.engagement_rate, "creator_profile.engagement_rate"),
      audience_age: assertString(creatorProfile.audience_age, "creator_profile.audience_age"),
      audience_gender: assertString(creatorProfile.audience_gender, "creator_profile.audience_gender"),
      content_style: assertString(creatorProfile.content_style, "creator_profile.content_style"),
      posting_frequency: assertString(creatorProfile.posting_frequency, "creator_profile.posting_frequency"),
    },
    rate_card: {
      range_low: assertNumber(rateCard.range_low, "rate_card.range_low"),
      range_high: assertNumber(rateCard.range_high, "rate_card.range_high"),
      currency: assertString(rateCard.currency, "rate_card.currency"),
      per: assertString(rateCard.per, "rate_card.per"),
      breakdown: {
        integration_30s: assertString(breakdown.integration_30s, "rate_card.breakdown.integration_30s"),
        dedicated_video: assertString(breakdown.dedicated_video, "rate_card.breakdown.dedicated_video"),
        instagram_story: assertString(breakdown.instagram_story, "rate_card.breakdown.instagram_story"),
      },
    },
    brand_matches: Array.isArray(root.brand_matches)
      ? root.brand_matches.map((entry, index) => {
          const item = entry as Record<string, unknown>;
          return {
            brand: assertString(item.brand, `brand_matches[${index}].brand`),
            category: assertString(item.category, `brand_matches[${index}].category`),
            tier: assertString(item.tier, `brand_matches[${index}].tier`),
            why_match: assertString(item.why_match, `brand_matches[${index}].why_match`),
            contact_route: assertString(item.contact_route, `brand_matches[${index}].contact_route`),
            contact_detail: assertString(item.contact_detail, `brand_matches[${index}].contact_detail`),
            last_verified: assertString(item.last_verified, `brand_matches[${index}].last_verified`),
          };
        })
      : (() => {
          throw new Error("brand_matches is missing");
        })(),
    pitch_emails: Array.isArray(root.pitch_emails)
      ? root.pitch_emails.map((entry, index) => {
          const item = entry as Record<string, unknown>;
          return {
            brand: assertString(item.brand, `pitch_emails[${index}].brand`),
            subject: assertString(item.subject, `pitch_emails[${index}].subject`),
            body: assertString(item.body, `pitch_emails[${index}].body`),
          };
        })
      : (() => {
          throw new Error("pitch_emails is missing");
        })(),
    media_kit_summary: assertString(root.media_kit_summary, "media_kit_summary"),
  };
}

function applyKnownStats(kit: SponsorshipKit, scrape: ScrapeResult, nicheNotes?: string) {
  const creatorProfile = {
    ...kit.creator_profile,
    platform: formatPlatform(scrape.platform),
    name: scrape.creator_name || kit.creator_profile.name,
    followers: scrape.followers ?? kit.creator_profile.followers,
    avg_views: scrape.avg_views ?? kit.creator_profile.avg_views,
    engagement_rate: formatPercent(scrape.engagement_rate_pct) || kit.creator_profile.engagement_rate,
    posting_frequency: scrape.posting_frequency || kit.creator_profile.posting_frequency,
    niche:
      kit.creator_profile.niche ||
      scrape.category ||
      nicheNotes ||
      "General Creator",
  };

  return {
    ...kit,
    readiness_score: Math.min(100, Math.max(1, kit.readiness_score)),
    creator_profile: creatorProfile,
    rate_card: {
      ...kit.rate_card,
      range_low: Math.max(0, kit.rate_card.range_low),
      range_high: Math.max(kit.rate_card.range_low, kit.rate_card.range_high),
      currency: kit.rate_card.currency || "USD",
    },
  };
}

function buildResearchPrompt(input: GenerateKitInput, scrape: ScrapeResult) {
  const researchPacket = {
    requested_url: scrape.url,
    platform: formatPlatform(scrape.platform),
    niche_notes: input.niche_notes || null,
    scrape_quality: scrape.scrape_quality,
    creator_name: scrape.creator_name,
    username: scrape.username,
    followers: scrape.followers,
    avg_views: scrape.avg_views,
    engagement_rate_pct: scrape.engagement_rate_pct,
    post_count: scrape.post_count,
    country: scrape.country,
    category: scrape.category,
    posting_frequency: scrape.posting_frequency,
    recent_content_themes: scrape.recent_content_themes,
    recent_videos: scrape.recent_videos,
    source_notes: scrape.source_notes,
  };

  return `
You are Sponza's sponsorship research team. Produce a polished creator sponsorship kit that reads as if it was written by an experienced sponsorship manager.

Hard requirements:
- Return JSON only.
- Never mention AI, a model, training data, automation, or uncertainty about being an assistant.
- Use the research packet below as the source of truth for any hard stats that are present.
- If a metric is missing, infer conservatively from the available profile signals and niche notes.
- readiness_insights must contain exactly 3 concise, commercially useful insights.
- brand_matches must contain exactly 25 real brands that are known to work with creators.
- pitch_emails must contain exactly 8 distinct outreach emails.
- For brand matches, write the rationale as "our research team matched you with..." style guidance.
- If a direct partnership email is uncertain, prefer a safer route such as "website form", "LinkedIn", or "Instagram DM" instead of inventing a fake personal email.
- Media kit summary should be 3 to 4 sentences.

Research packet:
${JSON.stringify(researchPacket, null, 2)}
`.trim();
}

export async function generateSponsorshipKit(
  input: GenerateKitInput,
  scrape: ScrapeResult
): Promise<SponsorshipKit> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: buildResearchPrompt(input, scrape),
        },
        {
          role: "user",
          content: "Return the complete sponsorship kit as JSON that matches the schema exactly.",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: KIT_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: unknown }>;
  };

  const message = payload.choices?.[0]?.message;
  const content = parseChatMessageContent(message);

  if (!content) {
    throw new Error("OpenAI response did not include JSON content");
  }

  const parsed = JSON.parse(content);
  const kit = coerceKitShape(parsed);
  return applyKnownStats(kit, scrape, input.niche_notes);
}
