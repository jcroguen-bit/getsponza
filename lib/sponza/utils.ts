import crypto from "crypto";

import type { Platform } from "@/lib/sponza/types";

const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "before",
  "behind",
  "best",
  "build",
  "creator",
  "daily",
  "episode",
  "from",
  "guide",
  "how",
  "into",
  "just",
  "life",
  "more",
  "my",
  "new",
  "our",
  "out",
  "part",
  "reel",
  "routine",
  "short",
  "shorts",
  "that",
  "the",
  "this",
  "tips",
  "today",
  "video",
  "vlog",
  "week",
  "what",
  "with",
  "your",
]);

export function ensureUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL required");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function normalizeUrl(input: string) {
  const url = new URL(ensureUrl(input));
  url.hash = "";

  if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") {
    const videoId = url.searchParams.get("v");
    url.search = "";

    if (videoId) {
      url.searchParams.set("v", videoId);
    }
  } else {
    url.search = "";
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}

export function detectPlatform(input: string): Platform {
  const hostname = new URL(ensureUrl(input)).hostname.toLowerCase();

  if (hostname.includes("youtube.com") || hostname === "youtu.be") {
    return "youtube";
  }

  if (hostname.includes("instagram.com")) {
    return "instagram";
  }

  if (hostname.includes("tiktok.com")) {
    return "tiktok";
  }

  return "unknown";
}

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

export function normalizeNicheNotes(notes?: string | null) {
  return notes?.trim().replace(/\s+/g, " ").toLowerCase() || "";
}

export function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function parseCompactNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/,/g, "").trim().toUpperCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?$/);

  if (!match) {
    const numeric = Number.parseInt(cleaned.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const amount = Number.parseFloat(match[1]);
  const suffix = match[2];

  if (!suffix) {
    return Math.round(amount);
  }

  const multiplier =
    suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : 1_000_000_000;

  return Math.round(amount * multiplier);
}

export function extractMetaContent(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return null;
}

export function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function extractTopThemes(values: Array<string | null | undefined>) {
  const words = values
    .filter(Boolean)
    .flatMap((value) =>
      value!
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    );

  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function formatPlatform(platform: Platform) {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    default:
      return "Unknown";
  }
}

export function formatPercent(value: number | null) {
  return value == null || !Number.isFinite(value) ? null : `${value.toFixed(1)}%`;
}

export function estimatePostingFrequency(dates: string[]) {
  if (dates.length < 2) {
    return null;
  }

  const timestamps = dates
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    return null;
  }

  const spanDays = Math.max((timestamps[timestamps.length - 1] - timestamps[0]) / 86_400_000, 1);
  const postsPerWeek = (timestamps.length / spanDays) * 7;

  if (postsPerWeek >= 6) {
    return `${Math.round(postsPerWeek)}/week`;
  }

  if (postsPerWeek >= 1) {
    return `${postsPerWeek.toFixed(1).replace(/\.0$/, "")}/week`;
  }

  const weeksPerPost = 1 / postsPerWeek;
  return `about every ${weeksPerPost.toFixed(1).replace(/\.0$/, "")} weeks`;
}

export function getInstagramUsername(input: string) {
  const url = new URL(ensureUrl(input));
  const [firstSegment] = url.pathname.split("/").filter(Boolean);
  return firstSegment || null;
}

export function getTikTokUsername(input: string) {
  const url = new URL(ensureUrl(input));
  const [firstSegment, secondSegment] = url.pathname.split("/").filter(Boolean);

  if (firstSegment === "@user" && secondSegment) {
    return secondSegment;
  }

  if (firstSegment?.startsWith("@")) {
    return firstSegment.slice(1);
  }

  return firstSegment || null;
}

export function getYouTubeVideoId(input: string) {
  const url = new URL(ensureUrl(input));

  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || null;
  }

  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.split("/").filter(Boolean)[1] || null;
  }

  return url.searchParams.get("v");
}
