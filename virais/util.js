export const WINDOW_DAYS = Number(process.env.VIRAIS_DIAS || 15);

export function windowStart() {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isInWindow(date) {
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d >= windowStart();
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * "Viral score": engajamento por hora desde a publicação.
 * Um vídeo com 1M de views em 1 dia vale mais que 1M em 14 dias.
 */
export function viralScore({ views, likes, comments, shares, publishedAt }) {
  const hours = Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / 36e5);
  const engagement = num(views) + 10 * num(likes) + 20 * num(comments) + 30 * num(shares);
  return Math.round(engagement / hours);
}

/** Formato padrão de cada item, independente da plataforma. */
export function normalize(item) {
  const out = {
    platform: item.platform,
    id: String(item.id),
    title: (item.title || "").trim().slice(0, 300),
    summary: item.summary || "",
    author: item.author || "",
    url: item.url,
    thumbnail: item.thumbnail || "",
    publishedAt: new Date(item.publishedAt).toISOString(),
    views: num(item.views),
    likes: num(item.likes),
    comments: num(item.comments),
    shares: num(item.shares),
  };
  out.score = viralScore(out);
  return out;
}
