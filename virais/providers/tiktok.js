import { isInWindow, normalize } from "../util.js";
import { inputFromEnv, listFromEnv, runActor } from "./apify.js";

const ACTOR = process.env.TIKTOK_ACTOR || "clockworks/tiktok-scraper";
const DEFAULT_HASHTAGS = ["fyp", "viral", "brasil", "trend", "humor"];

export async function fetchTikTok({ limit = 50 } = {}) {
  const hashtags = listFromEnv("TIKTOK_HASHTAGS", DEFAULT_HASHTAGS);
  const input = inputFromEnv("TIKTOK_ACTOR_INPUT", {
    hashtags,
    resultsPerPage: 40,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  const items = await runActor(ACTOR, input);

  const byId = new Map();
  for (const v of items) {
    const publishedAt = v.createTimeISO || (v.createTime ? v.createTime * 1000 : null);
    if (!v.id || !publishedAt || !isInWindow(publishedAt)) continue;
    byId.set(
      v.id,
      normalize({
        platform: "tiktok",
        id: v.id,
        title: v.text,
        author: v.authorMeta?.name ? `@${v.authorMeta.name}` : "",
        url: v.webVideoUrl || `https://www.tiktok.com/@${v.authorMeta?.name}/video/${v.id}`,
        thumbnail: v.videoMeta?.coverUrl || v.covers?.default || "",
        publishedAt,
        views: v.playCount,
        likes: v.diggCount,
        comments: v.commentCount,
        shares: v.shareCount,
      })
    );
  }
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
