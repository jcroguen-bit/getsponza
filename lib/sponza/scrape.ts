import { promisify } from "util";
import { execFile } from "child_process";

import type { Platform, RecentVideo, ScrapeResult } from "@/lib/sponza/types";
import {
  detectPlatform,
  ensureUrl,
  estimatePostingFrequency,
  extractMetaContent,
  extractTopThemes,
  formatPlatform,
  getInstagramUsername,
  getTikTokUsername,
  getYouTubeVideoId,
  normalizeUrl,
  parseCompactNumber,
} from "@/lib/sponza/utils";

const execFileAsync = promisify(execFile);

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, redirect: "follow" });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
}

function buildFallbackScrape(
  inputUrl: string,
  platform: Platform,
  nicheNotes?: string,
  sourceNotes: string[] = []
): ScrapeResult {
  const normalizedUrl = normalizeUrl(inputUrl);
  const username =
    platform === "instagram"
      ? getInstagramUsername(inputUrl)
      : platform === "tiktok"
        ? getTikTokUsername(inputUrl)
        : null;

  return {
    platform,
    url: ensureUrl(inputUrl),
    normalized_url: normalizedUrl,
    creator_name: username,
    username,
    followers: null,
    avg_views: null,
    engagement_rate_pct: null,
    post_count: null,
    country: null,
    category: null,
    recent_videos: [],
    recent_content_themes: extractTopThemes([username, nicheNotes]),
    posting_frequency: null,
    scrape_quality: "url-only",
    source_notes: sourceNotes,
    raw: {
      platform: formatPlatform(platform),
      fallback: true,
    },
  };
}

function parseYouTubeCount(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTitleValue(value: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value.split("|")[0]?.split("•")[0]?.trim();
  return cleaned || null;
}

async function getYouTubeCategoryNames(categoryIds: string[], regionCode: string) {
  if (!categoryIds.length || !process.env.YOUTUBE_API_KEY) {
    return new Map<string, string>();
  }

  const query = new URLSearchParams({
    part: "snippet",
    id: categoryIds.join(","),
    regionCode,
    key: process.env.YOUTUBE_API_KEY,
  });

  const payload = await fetchJson<{
    items?: Array<{ id?: string; snippet?: { title?: string } }>;
  }>(`https://www.googleapis.com/youtube/v3/videoCategories?${query.toString()}`);

  return new Map((payload.items || []).flatMap((item) => (item.id && item.snippet?.title ? [[item.id, item.snippet.title]] : [])));
}

async function resolveYouTubeChannelId(url: string) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }

  const normalized = new URL(ensureUrl(url));
  const pathname = normalized.pathname;
  const pathParts = pathname.split("/").filter(Boolean);
  const [firstPart, secondPart] = pathParts;

  if (normalized.hostname === "youtu.be" || pathname.startsWith("/watch") || pathname.startsWith("/shorts/")) {
    const videoId = getYouTubeVideoId(url);

    if (!videoId) {
      throw new Error("Could not resolve YouTube video ID");
    }

    const query = new URLSearchParams({
      part: "snippet",
      id: videoId,
      key: process.env.YOUTUBE_API_KEY,
    });

    const payload = await fetchJson<{
      items?: Array<{ snippet?: { channelId?: string } }>;
    }>(`https://www.googleapis.com/youtube/v3/videos?${query.toString()}`);

    const channelId = payload.items?.[0]?.snippet?.channelId;

    if (!channelId) {
      throw new Error("Could not resolve channel from video URL");
    }

    return channelId;
  }

  if (firstPart === "channel" && secondPart) {
    return secondPart;
  }

  if (firstPart?.startsWith("@")) {
    const query = new URLSearchParams({
      part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
      forHandle: firstPart.slice(1),
      key: process.env.YOUTUBE_API_KEY,
    });

    const payload = await fetchJson<{
      items?: Array<{ id?: string }>;
    }>(`https://www.googleapis.com/youtube/v3/channels?${query.toString()}`);

    const channelId = payload.items?.[0]?.id;

    if (!channelId) {
      throw new Error("Could not resolve channel from YouTube handle");
    }

    return channelId;
  }

  if (firstPart === "user" && secondPart) {
    const query = new URLSearchParams({
      part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
      forUsername: secondPart,
      key: process.env.YOUTUBE_API_KEY,
    });

    const payload = await fetchJson<{
      items?: Array<{ id?: string }>;
    }>(`https://www.googleapis.com/youtube/v3/channels?${query.toString()}`);

    const channelId = payload.items?.[0]?.id;

    if (channelId) {
      return channelId;
    }
  }

  const fallbackQuery = new URLSearchParams({
    part: "snippet",
    q: secondPart || firstPart || normalized.hostname,
    type: "channel",
    maxResults: "1",
    key: process.env.YOUTUBE_API_KEY,
  });

  const payload = await fetchJson<{
    items?: Array<{ snippet?: { channelId?: string } }>;
  }>(`https://www.googleapis.com/youtube/v3/search?${fallbackQuery.toString()}`);

  const channelId = payload.items?.[0]?.snippet?.channelId;

  if (!channelId) {
    throw new Error("Could not resolve YouTube channel");
  }

  return channelId;
}

async function scrapeYouTube(url: string, nicheNotes?: string): Promise<ScrapeResult> {
  if (!process.env.YOUTUBE_API_KEY) {
    return buildFallbackScrape(url, "youtube", nicheNotes, [
      "YouTube API key is missing, so the report was generated from the URL and niche notes only.",
    ]);
  }

  const sourceNotes: string[] = [];

  try {
    const channelId = await resolveYouTubeChannelId(url);
    const channelQuery = new URLSearchParams({
      part: "snippet,statistics,contentDetails,brandingSettings,topicDetails",
      id: channelId,
      key: process.env.YOUTUBE_API_KEY,
    });

    const channelPayload = await fetchJson<{
      items?: Array<{
        snippet?: {
          title?: string;
          customUrl?: string;
          country?: string;
          description?: string;
        };
        statistics?: {
          subscriberCount?: string;
          videoCount?: string;
          viewCount?: string;
        };
        contentDetails?: {
          relatedPlaylists?: {
            uploads?: string;
          };
        };
        brandingSettings?: {
          channel?: {
            country?: string;
          };
        };
        topicDetails?: {
          topicCategories?: string[];
        };
      }>;
    }>(`https://www.googleapis.com/youtube/v3/channels?${channelQuery.toString()}`);

    const channel = channelPayload.items?.[0];

    if (!channel) {
      throw new Error("YouTube channel data was empty");
    }

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    const subscriberCount = parseYouTubeCount(channel.statistics?.subscriberCount);
    const videoCount = parseYouTubeCount(channel.statistics?.videoCount);
    const totalChannelViews = parseYouTubeCount(channel.statistics?.viewCount);

    const recentVideos: RecentVideo[] = [];
    let avgViews: number | null = null;
    let engagementRatePct: number | null = null;
    let postingFrequency: string | null = null;
    let category: string | null = null;

    if (uploadsPlaylistId) {
      const uploadsQuery = new URLSearchParams({
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: "10",
        key: process.env.YOUTUBE_API_KEY,
      });

      const uploadsPayload = await fetchJson<{
        items?: Array<{
          contentDetails?: { videoId?: string; videoPublishedAt?: string };
          snippet?: { title?: string; publishedAt?: string };
        }>;
      }>(`https://www.googleapis.com/youtube/v3/playlistItems?${uploadsQuery.toString()}`);

      const videoIds = (uploadsPayload.items || [])
        .map((item) => item.contentDetails?.videoId)
        .filter((value): value is string => Boolean(value));

      if (videoIds.length) {
        const videosQuery = new URLSearchParams({
          part: "statistics,snippet",
          id: videoIds.join(","),
          key: process.env.YOUTUBE_API_KEY,
        });

        const videosPayload = await fetchJson<{
          items?: Array<{
            id?: string;
            snippet?: {
              title?: string;
              publishedAt?: string;
              categoryId?: string;
            };
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
          }>;
        }>(`https://www.googleapis.com/youtube/v3/videos?${videosQuery.toString()}`);

        const orderedVideos = videoIds.flatMap((videoId) =>
          (videosPayload.items || [])
            .filter((item) => item.id === videoId)
            .map((item) => ({
              title: item.snippet?.title || "Untitled video",
              views: parseYouTubeCount(item.statistics?.viewCount) || 0,
              published_at: item.snippet?.publishedAt,
              likes: parseYouTubeCount(item.statistics?.likeCount) || 0,
              comments: parseYouTubeCount(item.statistics?.commentCount) || 0,
              categoryId: item.snippet?.categoryId || null,
            }))
        );

        recentVideos.push(
          ...orderedVideos.map(({ title, views, published_at }) => ({
            title,
            views,
            published_at,
          }))
        );

        if (orderedVideos.length) {
          const totalRecentViews = orderedVideos.reduce((sum, video) => sum + video.views, 0);
          avgViews = Math.round(totalRecentViews / orderedVideos.length);

          const engagementSamples = orderedVideos
            .filter((video) => video.views > 0 && (video.likes > 0 || video.comments > 0))
            .map((video) => ((video.likes + video.comments) / video.views) * 100);

          if (engagementSamples.length) {
            engagementRatePct =
              engagementSamples.reduce((sum, value) => sum + value, 0) / engagementSamples.length;
          } else if (subscriberCount && avgViews) {
            engagementRatePct = (avgViews / subscriberCount) * 100;
          }

          postingFrequency = estimatePostingFrequency(
            orderedVideos
              .map((video) => video.published_at)
              .filter((value): value is string => Boolean(value))
          );

          const categoryIds = [...new Set(orderedVideos.map((video) => video.categoryId).filter(Boolean))] as string[];
          if (categoryIds.length) {
            const regionCode = channel.snippet?.country || channel.brandingSettings?.channel?.country || "US";
            const categoryMap = await getYouTubeCategoryNames(categoryIds, regionCode);
            category = categoryMap.get(categoryIds[0]) || null;
          }
        }
      }
    }

    if (!category) {
      const topic = channel.topicDetails?.topicCategories?.[0];
      category = topic?.split("/").pop()?.replace(/_/g, " ") || null;
    }

    if (!recentVideos.length && videoCount && totalChannelViews) {
      avgViews = Math.round(totalChannelViews / Math.max(videoCount, 1));
      if (subscriberCount) {
        engagementRatePct = (avgViews / subscriberCount) * 100;
      }
      sourceNotes.push("Recent video stats were unavailable, so averages were estimated from channel totals.");
    }

    const creatorName = channel.snippet?.title || null;

    return {
      platform: "youtube",
      url: ensureUrl(url),
      normalized_url: normalizeUrl(url),
      creator_name: creatorName,
      username: channel.snippet?.customUrl?.replace(/^@/, "") || null,
      followers: subscriberCount,
      avg_views: avgViews,
      engagement_rate_pct: engagementRatePct,
      post_count: videoCount,
      country: channel.snippet?.country || channel.brandingSettings?.channel?.country || null,
      category,
      recent_videos: recentVideos,
      recent_content_themes: extractTopThemes([
        ...recentVideos.map((video) => video.title),
        channel.snippet?.description,
        nicheNotes,
      ]),
      posting_frequency: postingFrequency,
      scrape_quality: recentVideos.length ? "full" : "partial",
      source_notes: sourceNotes,
      raw: {
        channel_name: creatorName,
        total_channel_views: totalChannelViews,
      },
    };
  } catch (error) {
    sourceNotes.push(
      error instanceof Error
        ? `YouTube scraping degraded gracefully: ${error.message}`
        : "YouTube scraping degraded gracefully."
    );
    return buildFallbackScrape(url, "youtube", nicheNotes, sourceNotes);
  }
}

function extractCountFromDescription(description: string | null, label: "followers" | "posts" | "likes") {
  if (!description) {
    return null;
  }

  const patterns =
    label === "posts"
      ? [/([\d.,]+)\s+posts/i]
      : label === "likes"
        ? [/([\d.,KM B]+)\s+likes/i]
        : [/([\d.,KM B]+)\s+followers/i];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      return parseCompactNumber(match[1].replace(/\s+/g, ""));
    }
  }

  return null;
}

async function runYtDlp(url: string) {
  try {
    const { stdout } = await execFileAsync("yt-dlp", ["--dump-single-json", "--skip-download", url], {
      maxBuffer: 2_000_000,
    });

    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function scrapeSocial(url: string, platform: "instagram" | "tiktok", nicheNotes?: string): Promise<ScrapeResult> {
  const sourceNotes: string[] = [];
  const normalizedUrl = normalizeUrl(url);
  const username = platform === "instagram" ? getInstagramUsername(url) : getTikTokUsername(url);

  let creatorName: string | null = username;
  let followers: number | null = null;
  let postCount: number | null = null;
  let pageTitle: string | null = null;
  let pageDescription: string | null = null;
  let oEmbedTitle: string | null = null;

  const raw: Record<string, unknown> = {};

  if (platform === "tiktok") {
    try {
      const oEmbed = await fetchJson<{
        author_name?: string;
        title?: string;
      }>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(ensureUrl(url))}`);
      creatorName = oEmbed.author_name || creatorName;
      oEmbedTitle = oEmbed.title || null;
      raw.oembed = oEmbed;
    } catch (error) {
      sourceNotes.push(
        error instanceof Error
          ? `TikTok oEmbed was unavailable: ${error.message}`
          : "TikTok oEmbed was unavailable."
      );
    }
  } else {
    const endpoints = [
      `https://www.instagram.com/oembed?url=${encodeURIComponent(ensureUrl(url))}`,
      `https://graph.facebook.com/v20.0/instagram_oembed?url=${encodeURIComponent(ensureUrl(url))}`,
    ];

    let oEmbedLoaded = false;
    for (const endpoint of endpoints) {
      try {
        const oEmbed = await fetchJson<{ author_name?: string; title?: string }>(endpoint);
        creatorName = oEmbed.author_name || creatorName;
        oEmbedTitle = oEmbed.title || null;
        raw.oembed = oEmbed;
        oEmbedLoaded = true;
        break;
      } catch {
        continue;
      }
    }

    if (!oEmbedLoaded) {
      sourceNotes.push("Instagram oEmbed was unavailable, so the scraper used public page metadata only.");
    }
  }

  try {
    const html = await fetchText(ensureUrl(url));
    pageTitle = parseTitleValue(extractMetaContent(html, "og:title"));
    pageDescription = extractMetaContent(html, "og:description") || extractMetaContent(html, "description");
    raw.page_title = pageTitle;
    raw.page_description = pageDescription;

    creatorName = creatorName || pageTitle;
    followers = extractCountFromDescription(pageDescription, "followers");
    postCount = extractCountFromDescription(pageDescription, "posts");

    if (platform === "tiktok" && !followers) {
      const followerMatch = html.match(/"followerCount":(\d+)/i) || html.match(/"follower_count":(\d+)/i);
      followers = followerMatch?.[1] ? Number.parseInt(followerMatch[1], 10) : followers;
    }
  } catch (error) {
    sourceNotes.push(
      error instanceof Error
        ? `Public ${formatPlatform(platform)} page metadata could not be fetched: ${error.message}`
        : `Public ${formatPlatform(platform)} page metadata could not be fetched.`
    );
  }

  if (platform === "tiktok" && (!followers || !postCount)) {
    const ytDlpData = await runYtDlp(ensureUrl(url));
    if (ytDlpData) {
      creatorName = (ytDlpData.uploader as string) || creatorName;
      followers =
        (typeof ytDlpData.channel_follower_count === "number" ? ytDlpData.channel_follower_count : null) ||
        followers;
      postCount = (typeof ytDlpData.playlist_count === "number" ? ytDlpData.playlist_count : null) || postCount;
      raw.yt_dlp = {
        has_data: true,
      };
    }
  }

  const themes = extractTopThemes([oEmbedTitle, pageTitle, pageDescription, nicheNotes]);
  const statsAvailable = followers !== null || postCount !== null;

  if (!statsAvailable) {
    sourceNotes.push(
      `${formatPlatform(platform)} public stats were unavailable, so the analysis leaned on the URL and niche notes.`
    );
  }

  return {
    platform,
    url: ensureUrl(url),
    normalized_url: normalizedUrl,
    creator_name: creatorName,
    username,
    followers,
    avg_views: null,
    engagement_rate_pct: null,
    post_count: postCount,
    country: null,
    category: null,
    recent_videos: [],
    recent_content_themes: themes,
    posting_frequency: null,
    scrape_quality: statsAvailable ? "partial" : "url-only",
    source_notes: sourceNotes,
    raw,
  };
}

export async function scrapeCreator(url: string, nicheNotes?: string): Promise<ScrapeResult> {
  const platform = detectPlatform(url);

  switch (platform) {
    case "youtube":
      return scrapeYouTube(url, nicheNotes);
    case "instagram":
      return scrapeSocial(url, "instagram", nicheNotes);
    case "tiktok":
      return scrapeSocial(url, "tiktok", nicheNotes);
    default:
      return buildFallbackScrape(url, "unknown", nicheNotes, [
        "The platform could not be identified, so the analysis used the URL and niche notes only.",
      ]);
  }
}

export { buildFallbackScrape };
