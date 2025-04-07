const express = require("express");
const playwright = require("playwright");
const cors = require("cors");

const app = express();
app.use(cors());

const launchBrowser = async () => {
  return await playwright.chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
};

const createContext = async (browser) => {
  return await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true,
    bypassCSP: true,
    locale: "pt-BR",
  });
};

// Rota para raspagem individual
app.get("/scrape", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });

  const browser = await launchBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

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

// Rota para coletar todos os produtos da coleção
app.get("/scrape-collection", async (req, res) => {
  const collectionUrl = req.query.url;
  if (!collectionUrl) return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });

  const browser = await launchBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    await page.goto(collectionUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Coleta os links dos produtos
    const productLinks = await page.$$eval('a[href*="/products/"]', links => {
      const urls = links.map(link => link.href);
      return Array.from(new Set(urls)).slice(0, 100);
    });

    const products = [];

    for (const url of productLinks) {
      const productPage = await context.newPage();

      try {
        await productPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        const title = await productPage.title();

        const price =
          (await productPage.$eval('[class*="price"]', el => el.innerText).catch(() => null)) ||
          (await productPage.$eval('[class*="valor"]', el => el.innerText).catch(() => null));

        const image =
          (await productPage.$eval('img', el => el.src).catch(() => null)) ||
          (await productPage.$eval('[class*="image"] img', el => el.src).catch(() => null));

        const description =
          (await productPage.$eval('meta[name="description"]', el => el.content).catch(() => null)) ||
          (await productPage.$eval('[class*="description"]', el => el.innerText).catch(() => null));

        products.push({ url, title, price, image, description });
      } catch (err) {
        products.push({ url, error: "Erro ao raspar este produto" });
      }

      await productPage.close();
    }

    await browser.close();
    return res.json({ success: true, count: products.length, products });

  } catch (error) {
    await browser.close();
    return res.status(500).json({
      success: false,
      message: "Erro ao acessar a coleção",
      error: error.message,
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("🚀 Servidor rodando em http://localhost:" + port));
