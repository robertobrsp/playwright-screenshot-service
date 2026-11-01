import { isInWindow, normalize } from "../util.js";
import { inputFromEnv, listFromEnv, runActor } from "./apify.js";

const ACTOR = process.env.INSTAGRAM_ACTOR || "apify/instagram-hashtag-scraper";
const DEFAULT_HASHTAGS = ["reels", "viral", "brasil", "humor", "trend"];

export async function fetchInstagram({ limit = 50 } = {}) {
  const hashtags = listFromEnv("INSTAGRAM_HASHTAGS", DEFAULT_HASHTAGS);
  const input = inputFromEnv("INSTAGRAM_ACTOR_INPUT", { hashtags, resultsLimit: 40 });

  const items = await runActor(ACTOR, input);

  const byId = new Map();
  for (const p of items) {
    const id = p.id || p.shortCode;
    if (!id || !p.timestamp || !isInWindow(p.timestamp)) continue;
    byId.set(
      id,
      normalize({
        platform: "instagram",
        id,
        title: p.caption,
        author: p.ownerUsername ? `@${p.ownerUsername}` : "",
        url: p.url || `https://www.instagram.com/p/${p.shortCode}/`,
        thumbnail: p.displayUrl || "",
        publishedAt: p.timestamp,
        views: p.videoPlayCount ?? p.videoViewCount,
        likes: p.likesCount > 0 ? p.likesCount : 0, // -1 quando curtidas ocultas
        comments: p.commentsCount,
      })
    );
  }
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
