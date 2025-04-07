const playwright = require('playwright');

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL é obrigatória' });
  }

  const browser = await playwright.chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });

    const title = await page.title();

    const price = await page.$eval('[class*="price"]', el => el.innerText).catch(() => null);
    const image = await page.$eval('img', el => el.src).catch(() => null);
    const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);

    await browser.close();

    return res.status(200).json({
      title,
      price,
      image,
      description,
    });

  } catch (err) {
    await browser.close();
    return res.status(500).json({ error: 'Erro na raspagem', details: err.message });
  }
};
