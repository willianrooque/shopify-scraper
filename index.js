const express = require("express");
const playwright = require("playwright");
const cors = require("cors");

const app = express();
app.use(cors()); // Libera CORS para chamadas externas

app.get("/scrape", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });

  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,800"
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true,
    bypassCSP: true,
    locale: "pt-BR",
  });

  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Aguarda pelo menos 1 imagem ou título na tela
    await page.waitForSelector("img", { timeout: 15000 });

    // Scraping com fallback
    const title = await page.title();

    const price =
      (await page.$eval('[class*="price"]', el => el.innerText).catch(() => null)) ||
      (await page.$eval('[class*="valor"]', el => el.innerText).catch(() => null));

    const image =
      (await page.$eval('img', el => el.src).catch(() => null)) ||
      (await page.$eval('[class*="image"] img', el => el.src).catch(() => null));

    const description =
      (await page.$eval('meta[name="description"]', el => el.content).catch(() => null)) ||
      (await page.$eval('[class*="description"]', el => el.innerText).catch(() => null));

    await browser.close();

    return res.json({ title, price, image, description, success: true });

  } catch (error) {
    await browser.close();
    return res.status(500).json({
      success: false,
      message: "Erro ao processar a página",
      error: error.message,
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("🚀 Servidor rodando em http://localhost:" + port));
