export const scrapeSynevo = async (browser, analysisName) => {
  const results = [];
  try {
    const page = await browser.newPage();

    // Optimizare: Blocăm imaginile și fonturile pentru viteză
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType()))
        req.abort();
      else req.continue();
    });

    await page.goto('https://www.synevo.ro/', { waitUntil: 'networkidle2' });

    const searchSelector = '.search-input-search';
    await page.waitForSelector(searchSelector, { timeout: 5000 });
    await page.type(searchSelector, analysisName, { delay: 50 });
    await page.waitForSelector('.search-results-item', { timeout: 8000 });

    const data = await page.evaluate(() => {
      const items = document.querySelectorAll('.search-results-item');
      const found = [];
      items.forEach((item) => {
        if (item.classList.contains('out-of-stock')) return;
        const nameEl = item.querySelector('.search-result-item-title');
        const priceEl = item.querySelector('.search-results-price');
        const linkEl = item.querySelector('a');

        if (nameEl && priceEl) {
          const name = nameEl.innerText.trim();
          const priceText = priceEl.innerText.trim();
          const match = priceText.match(/(\d+[.,]?\d*)/);

          if (match) {
            found.push({
              clinic: 'Synevo',
              name: name,
              price: parseFloat(match[0].replace(',', '.')),
              currency: 'RON',
              url: linkEl ? linkEl.href : 'https://www.synevo.ro',
            });
          }
        }
      });
      return found.slice(0, 4);
    });

    if (data.length > 0) results.push(...data);
    await page.close(); // Închidem tab-ul după ce terminăm
  } catch (err) {
    // Eroare la colectarea prețurilor Synevo
  }

  return results;
};
