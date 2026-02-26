import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("site/assets/media/immagini");

const TARGETS = [
  { key: "alc", url: "https://alclavorazioni.it/", file: "frame-alc.png" },
  { key: "fqs", url: "https://consulenzafqs.com/", file: "frame-fqs.png" },
  { key: "supreme", url: "https://supremecars.it/", file: "frame-supreme.png" },
  { key: "demasi", url: "https://demasiauto.it/", file: "frame-demasi.png" },
];

const VIEWPORT = { width: 1600, height: 1000 }; // 16:10 per le card

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  const results = [];
  for (const t of TARGETS) {
    const outPath = path.join(OUT_DIR, t.file);
    const startedAt = Date.now();
    try {
      await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);

      await page.screenshot({ path: outPath, type: "png" });
      results.push({ key: t.key, url: t.url, file: t.file, ms: Date.now() - startedAt });
      // eslint-disable-next-line no-console
      console.log(`OK  ${t.key} -> ${t.file} (${Date.now() - startedAt}ms)`);
    } catch (err) {
      results.push({ key: t.key, url: t.url, file: t.file, error: String(err) });
      // eslint-disable-next-line no-console
      console.error(`ERR ${t.key}: ${String(err)}`);
    }
  }

  await browser.close();
  await writeFile(path.join(OUT_DIR, "frames.manifest.json"), JSON.stringify(results, null, 2), "utf8");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

