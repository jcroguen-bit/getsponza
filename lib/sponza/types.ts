export type Platform = "youtube" | "instagram" | "tiktok" | "unknown";

export type AccessTier = "free" | "paid";

export interface RecentVideo {
  title: string;
  views: number;
  published_at?: string;
}

export interface ScrapeResult {
  platform: Platform;
  url: string;
  normalized_url: string;
  creator_name: string | null;
  username: string | null;
  followers: number | null;
  avg_views: number | null;
  engagement_rate_pct: number | null;
  post_count: number | null;
  country: string | null;
  category: string | null;
  recent_videos: RecentVideo[];
  recent_content_themes: string[];
  posting_frequency: string | null;
  scrape_quality: "full" | "partial" | "url-only";
  source_notes: string[];
  raw: Record<string, unknown>;
}

export interface CreatorProfile {
  name: string;
  platform: string;
  niche: string;
  followers: number;
  avg_views: number;
  engagement_rate: string;
  audience_age: string;
  audience_gender: string;
  content_style: string;
  posting_frequency: string;
}

export interface RateCard {
  range_low: number;
  range_high: number;
  currency: string;
  per: string;
  breakdown: {
    integration_30s: string;
    dedicated_video: string;
    instagram_story: string;
  };
}

export interface BrandMatch {
  brand: string;
  category: string;
  tier: string;
  why_match: string;
  contact_route: string;
  contact_detail: string;
  last_verified: string;
}

export interface PitchEmail {
  brand: string;
  subject: string;
  body: string;
}

export interface SponsorshipKit {
  readiness_score: number;
  readiness_label: string;
  readiness_insights: string[];
  creator_profile: CreatorProfile;
  rate_card: RateCard;
  brand_matches: BrandMatch[];
  pitch_emails: PitchEmail[];
  media_kit_summary: string;
}

export interface GenerateKitInput {
  url: string;
  email?: string;
  niche_notes?: string;
}

export interface KitRecord {
  id: number;
  platform: Platform;
  email: string | null;
  created_at: string;
  paid_at: string | null;
  full_kit_json: SponsorshipKit;
  scrape_json: ScrapeResult | null;
}
