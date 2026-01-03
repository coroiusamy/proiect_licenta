export const scrapeBioclinica = async (browser, analysisName) => {
  const results = [];
  try {
    console.log('   -> 🟢 Scrape Bioclinica...');
    const page = await browser.newPage();

    const searchUrl = `https://bioclinica.ro/cautare/${encodeURIComponent(
      analysisName
    )}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    try {
      await page.waitForSelector('main ul li', { timeout: 5000 });
    } catch (e) {}

    // 1. Colectăm link-urile
    const detailLinks = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('main ul li'));
      const foundLinks = [];
      for (const li of items) {
        const badge = li.querySelector('.bg-medium-green');
        if (badge && badge.innerText.trim().toUpperCase() === 'ANALIZE') {
          const link = li.querySelector('a');
          if (link) foundLinks.push(link.href);
        }
      }
      return foundLinks.slice(0, 3);
    });

    // 2. Vizităm link-urile
    for (const link of detailLinks) {
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded' });
        try {
          await page.waitForSelector('aside', { timeout: 2500 });
        } catch (e) {}

        const extracted = await page.evaluate(() => {
          const aside = document.querySelector('aside');
          if (!aside) return null;
          const divs = Array.from(aside.querySelectorAll('div'));
          const name =
            document.querySelector('h1')?.innerText.trim() || 'Analiză';

          for (const div of divs) {
            const txt = div.innerText;
            if (
              (txt.includes('LEI') || txt.includes('RON')) &&
              txt.length < 50
            ) {
              const match = txt.match(/(\d+[.,]?\d*)/);
              if (match) {
                return {
                  clinic: 'Bioclinica',
                  name: name,
                  price: parseFloat(match[0].replace(',', '.')),
                  currency: 'RON',
                };
              }
            }
          }
          return null;
        });

        if (extracted) {
          results.push({
            clinic: 'Bioclinica',
            name: extracted.name,
            price: extracted.price,
            currency: 'RON',
            url: link,
          });
        }
      } catch (innerErr) {
        /* ignore navigation errors */
      }
    }

    await page.close();
  } catch (err) {
    console.error('   ❌ Eroare Bioclinica:', err.message);
  }

  return results;
};
