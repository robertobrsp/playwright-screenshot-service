import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "1mb" }));

const API_KEY = process.env.API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN; // ex: "0199ca76-...sandbox.mocha.app"

function isAllowedUrl(url) {
  try {
    const u = new URL(url);
    // Só permite https e apenas o host do seu app
    return u.protocol === "https:" && u.host === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/screenshot", async (req, res) => {
  const key = req.header("x-api-key");
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { url, selector = "#powerbi-report-container", fullPage = false } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing url" });
  if (!ALLOWED_ORIGIN) return res.status(500).json({ error: "Missing ALLOWED_ORIGIN env" });
  if (!isAllowedUrl(url)) return res.status(400).json({ error: "URL not allowed" });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Espera o container do report aparecer
    await page.waitForSelector(selector, { timeout: 120000 });

    // Espera um pouco para o Power BI terminar a renderização
    await page.waitForTimeout(2000);

    let buf;
    if (fullPage) {
      buf = await page.screenshot({ type: "png", fullPage: true });
    } else {
      const el = await page.$(selector);
      if (!el) return res.status(404).json({ error: "Selector not found" });
      buf = await el.screenshot({ type: "png" });
    }

    res.setHeader("Content-Type", "image/png");
    return res.send(buf);
  } catch (e) {
    return res.status(500).json({ error: "Screenshot failed", details: String(e?.message || e) });
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on ${port}`));
