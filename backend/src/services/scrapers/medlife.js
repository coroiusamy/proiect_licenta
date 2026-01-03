export const scrapeMedlife = async (browser, analysisName) => {
  const results = [];
  try {
    console.log('   -> 🔵 Scrape MedLife...');
    const page = await browser.newPage();

    // Optimizare: Blocăm resurse inutile
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    // 1. Navigare directă pe pagina de rezultate
    ///cauta/analize/termen
    const searchUrl = `https://www.medlife.ro/cauta/analize/${encodeURIComponent(
      analysisName
    )}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    // Așteptăm să apară prețurile
    try {
      await page.waitForSelector('.pret', { timeout: 5000 });
    } catch (e) {
      console.log(
        '      ⚠️ MedLife: Nu am găsit prețuri (posibil 0 rezultate).'
      );
      await page.close();
      return [];
    }

    // 2. Extragem datele
    const data = await page.evaluate(() => {
      // Strategie: Luăm toate elementele de preț (.pret)
      // și ne uităm la "părintele" lor pentru a găsi titlul (h2)
      const priceElements = Array.from(document.querySelectorAll('.pret'));
      const found = [];

      priceElements.forEach((priceEl) => {
        const parentDiv = priceEl.parentElement;
        const titleEl = parentDiv.querySelector('h2');
        const linkEl = parentDiv.querySelector('a');

        if (titleEl && priceEl) {
          const name = titleEl.innerText.trim();
          const priceText = priceEl.innerText.trim();

          // Extragem numărul
          const match = priceText.match(/(\d+[.,]?\d*)/);

          if (match) {
            found.push({
              clinic: 'MedLife',
              name: name,
              price: parseFloat(match[0].replace(',', '.')),
              currency: 'RON',
              url: linkEl ? linkEl.href : 'https://www.medlife.ro',
            });
          }
        }
      });
      return found.slice(0, 4); // Luăm primele 4
    });

    if (data.length > 0) {
      results.push(...data);
      console.log(`      ✅ MedLife: ${data.length} rezultate.`);
    }

    await page.close();
  } catch (err) {
    console.error('   ❌ Eroare MedLife:', err.message);
  }

  return results;
};
