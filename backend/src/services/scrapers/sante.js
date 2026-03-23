export const scrapeSante = async (browser, analysisName) => {
  const results = [];
  try {
    const page = await browser.newPage();

    // Optimizare: Blocăm resursele inutile
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    const searchUrl = `https://www.clinica-sante.com/ro/?s=${encodeURIComponent(
      analysisName,
    )}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // Așteptăm să apară prețurile
    try {
      await page.waitForSelector('.loop-product-prices', { timeout: 6000 });
    } catch (e) {}

    const data = await page.evaluate(() => {
      // Selectăm containerele de preț pentru a găsi produsele
      const products = Array.from(document.querySelectorAll('.product')); // Clasa standard WooCommerce

      const found = [];

      products.forEach((product) => {
        // 1. Titlul
        const titleEl =
          product.querySelector('h4') ||
          product.querySelector('.woocommerce-loop-product__title');
        // 2. Prețul
        const priceEl = product.querySelector('.loop-product-prices');
        // 3. Linkul
        const linkEl = product.querySelector('a');

        if (titleEl && priceEl) {
          const name = titleEl.innerText.trim();

          const insPrice = priceEl.querySelector('ins');
          const priceText = insPrice ? insPrice.innerText : priceEl.innerText;

          // Extragem numărul
          // Regex: caută cifre, opțional punct sau virgulă, apoi cifre
          const match =
            priceText.match(/(\d+[,.]\d+)/) || priceText.match(/(\d+)/);

          if (match) {
            // Înlocuim virgula cu punct pentru a face parseFloat (12,32 -> 12.32)
            const priceValue = parseFloat(match[0].replace(',', '.'));

            found.push({
              clinic: 'Sante',
              name: name,
              price: priceValue,
              currency: 'RON',
              url: linkEl ? linkEl.href : 'https://www.clinica-sante.com',
            });
          }
        }
      });
      return found.slice(0, 4); // Luăm top 4
    });

    if (data.length > 0) {
      results.push(...data);
    }

    await page.close();
  } catch (err) {
    // Eroare la colectarea prețurilor Sante
  }

  return results;
};
