import express from "express";
import { fetchYouTube } from "./providers/youtube.js";
import { fetchTikTok } from "./providers/tiktok.js";
import { fetchInstagram } from "./providers/instagram.js";
import { mockItems } from "./providers/mock.js";
import { WINDOW_DAYS } from "./util.js";

const CACHE_MS = Number(process.env.VIRAIS_CACHE_MINUTOS || 60) * 60 * 1000;

const ALL_PLATFORMS = {
  youtube: { fetch: fetchYouTube, enabled: () => !!process.env.YOUTUBE_API_KEY, needs: "YOUTUBE_API_KEY" },
  tiktok: { fetch: fetchTikTok, enabled: () => !!process.env.APIFY_TOKEN, needs: "APIFY_TOKEN" },
  instagram: { fetch: fetchInstagram, enabled: () => !!process.env.APIFY_TOKEN, needs: "APIFY_TOKEN" },
};

// Quais plataformas o site mostra (padrão: só YouTube). Ex.: VIRAIS_PLATAFORMAS=youtube,tiktok,instagram
const ENABLED = (process.env.VIRAIS_PLATAFORMAS || "youtube").split(",").map((s) => s.trim().toLowerCase());
const PLATFORMS = Object.fromEntries(Object.entries(ALL_PLATFORMS).filter(([k]) => ENABLED.includes(k)));

// cache[platform] = { at, data, promise }
const cache = {};

async function load(name, { force = false } = {}) {
  const p = PLATFORMS[name];
  if (!p.enabled()) {
    return { platform: name, demo: true, note: `Defina ${p.needs} para dados reais`, items: mockItems(name) };
  }

  const c = (cache[name] ||= {});
  const fresh = c.data && Date.now() - c.at < CACHE_MS;
  if (fresh && !force) return c.data;
  // Evita disparar várias buscas ao mesmo tempo para a mesma plataforma
  if (c.promise) return c.promise;

  c.promise = p
    .fetch()
    .then((items) => {
      c.data = { platform: name, demo: false, updatedAt: new Date().toISOString(), items };
      c.at = Date.now();
      return c.data;
    })
    .catch((err) => {
      console.error(`[virais] ${name}:`, err.message);
      // Se já tínhamos dados bons, devolve-os com aviso. Em ambos os casos guarda o
      // resultado por 5 min para não martelar a API enquanto ela estiver falhando.
      const lastGood = c.data && !c.data.error ? c.data : c.lastGood;
      c.lastGood = lastGood;
      c.data = lastGood
        ? { ...lastGood, stale: true, error: true }
        : { platform: name, demo: false, error: true, items: [] };
      c.at = Date.now() - CACHE_MS + 5 * 60 * 1000;
      return c.data;
    })
    .finally(() => {
      c.promise = null;
    });
  return c.promise;
}

export const viraisRouter = express.Router();

viraisRouter.get("/api/virais", async (req, res) => {
  const requested = String(req.query.plataforma || Object.keys(PLATFORMS).join(","))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => PLATFORMS[s]);

  // Forçar atualização exige a mesma API_KEY do serviço de screenshot
  const force = req.query.atualizar === "1" && process.env.API_KEY && req.header("x-api-key") === process.env.API_KEY;

  const results = await Promise.all(requested.map((name) => load(name, { force })));
  res.json({ windowDays: WINDOW_DAYS, generatedAt: new Date().toISOString(), platforms: results });
});

/** Aquece o cache ao subir o servidor e renova periodicamente. */
export function startViraisRefresh() {
  const refresh = () =>
    Object.keys(PLATFORMS)
      .filter((n) => PLATFORMS[n].enabled())
      .forEach((n) => load(n, { force: true }));
  refresh();
  setInterval(refresh, CACHE_MS).unref();
}
