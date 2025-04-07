const express = require("express");
const playwright = require("playwright");
const app = express();

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Parâmetro 'url' é obrigatório" });

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { timeout: 60000 });

    const title = await page.title();
    const price = await page.$eval('[class*="price"]', el => el.innerText).catch(() => null);
    const image = await page.$eval('img', el => el.src).catch(() => null);
    const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);

    await browser.close();
    return res.json({ title, price, image, description });
  } catch (err) {
    await browser.close();
    return res.status(500).json({ error: "Erro ao raspar", details: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Servidor rodando na porta " + port));
