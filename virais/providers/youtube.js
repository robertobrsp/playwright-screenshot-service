import { isInWindow, normalize, windowStart } from "../util.js";

const API = "https://www.googleapis.com/youtube/v3";

async function yt(path, params) {
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Junta duas fontes:
 *  1. chart=mostPopular (aba "Em alta" do YouTube no país)  — 1 unidade de cota
 *  2. search ordenado por views, publicado nos últimos N dias — 100 unidades de cota
 * e mantém só o que foi publicado dentro da janela.
 */
export async function fetchYouTube({ region = process.env.VIRAIS_REGIAO || "BR", limit = 50 } = {}) {
  const popular = await yt("videos", {
    part: "snippet,statistics",
    chart: "mostPopular",
    regionCode: region,
    maxResults: 50,
  });

  const search = await yt("search", {
    part: "id",
    type: "video",
    order: "viewCount",
    publishedAfter: windowStart().toISOString(),
    regionCode: region,
    relevanceLanguage: (process.env.VIRAIS_IDIOMA || "pt"),
    maxResults: 50,
  });

  const seen = new Set((popular.items || []).map((v) => v.id));
  const extraIds = (search.items || []).map((s) => s.id?.videoId).filter((id) => id && !seen.has(id));

  let extra = [];
  if (extraIds.length) {
    const details = await yt("videos", { part: "snippet,statistics", id: extraIds.join(",") });
    extra = details.items || [];
  }

  return [...(popular.items || []), ...extra]
    .filter((v) => isInWindow(v.snippet?.publishedAt))
    .map((v) =>
      normalize({
        platform: "youtube",
        id: v.id,
        title: v.snippet.title,
        author: v.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail:
          v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
        publishedAt: v.snippet.publishedAt,
        views: v.statistics?.viewCount,
        likes: v.statistics?.likeCount,
        comments: v.statistics?.commentCount,
      })
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
