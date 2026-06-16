export const scrapeReginaMaria = async (browser, analysisName) => {
  const results = [];

  try {
    const page = await browser.newPage();

    // Mod stealth
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1366, height: 768 });

    // Navigare
    const searchUrl = `https://www.reginamaria.ro/rezultate-cautare/${encodeURIComponent(
      analysisName,
    )}`;
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Așteaptă banner cookies
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Click pe "Acceptați toate"
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const variants = ['acceptați toate', 'acceptati toate', 'accept all'];

        for (const variant of variants) {
          const btn = buttons.find(
            (b) =>
              b.textContent && b.textContent.toLowerCase().includes(variant),
          );
          if (btn) {
            btn.click();
            return;
          }
        }

        // Fallback: Ascunde banner cu CSS
        const style = document.createElement('style');
        style.textContent = `
          [role="dialog"], .modal, .cookie-banner, .consent-banner,
          div[class*="consent"], div[class*="cookie"] {
            display: none !important;
          }
          body { overflow: auto !important; }
        `;
        document.head.appendChild(style);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      // Continuăm oricum
    }

    // Scroll pentru a încărca rezultate
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Extrage link-uri către analize
    let detailLinks = [];

    try {
      await page.waitForSelector('.view-id-search-analysis-dictionary', { timeout: 5000 });

      detailLinks = await page.evaluate((query) => {
        const rows = Array.from(
          document.querySelectorAll('.view-id-search-analysis-dictionary .views-row'),
        );
        
        const normalizedQuery = query.toLowerCase().trim();
        const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 2);

        const items = rows
          .map((row) => {
            const link = row.querySelector('a');
            if (link && (link.href.includes('dictionar-de-analize') || link.href.includes('laboratoare-inteligente'))) {
              const name = link.innerText.trim();
              const url = link.href;
              
              const normalizedName = name.toLowerCase();
              let score = 0;
              
              // Direct match
              if (normalizedName === normalizedQuery) score += 100;
              // Contains full query
              if (normalizedName.includes(normalizedQuery)) score += 50;
              // Token matches
              for (const token of queryTokens) {
                if (normalizedName.includes(token)) {
                  score += 15;
                }
              }
              // Synonyms/Equivalents: Glicemie <-> Glucoza
              if (normalizedQuery.includes('glicem') && normalizedName.includes('glucoz')) {
                score += 30;
              }
              if (normalizedQuery.includes('glucoz') && normalizedName.includes('glicem')) {
                score += 30;
              }

              return { url, name, score };
            }
            return null;
          })
          .filter(Boolean);

        // Sort descending by score
        items.sort((a, b) => b.score - a.score);

        // Map back to expected structure and take top 4
        return items.slice(0, 4).map(item => ({ url: item.url, name: item.name }));
      }, analysisName);
    } catch (e) {
      // Plan B: Caută direct toate link-urile din pagină, dar filtrează link-urile generice
      detailLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const found = [];
        const seen = new Set();

        for (const link of links) {
          if (!link.href) continue;
          
          const isAnalysisUrl = link.href.includes('dictionar-de-analize') || 
                               (link.href.includes('gama-de-analize') && link.href.includes('investigation=') && !link.href.includes('investigation=All'));

          if (isAnalysisUrl && !seen.has(link.href)) {
            const text = link.innerText.trim();
            const isGenericText = text.toLowerCase().includes('calculator') || 
                                  text.toLowerCase().includes('teste genetica') || 
                                  text.toLowerCase().includes('vezi toate');
            
            if (text.length > 3 && !isGenericText) {
              found.push({ url: link.href, name: text });
              seen.add(link.href);
            }
          }
        }
        return found.slice(0, 3);
      });
    }

    if (detailLinks.length === 0) {
      await page.close();
      return [];
    }

    // Vizitează paginile de detalii
    for (const item of detailLinks) {
      try {
        await page.goto(item.url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        // Click cookies dacă apare din nou
        try {
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(
              (b) =>
                b.textContent && b.textContent.toLowerCase().includes('accept'),
            );
            if (btn) btn.click();
          });
        } catch (e) {}

        // Extrage preț
        // Extrage preț (suportă atât clasa .price cât și vechiul selector views-field)
        await page.waitForSelector('.price, .views-field-field-price .field-content', {
          timeout: 5000,
        });

        const price = await page.evaluate(() => {
          const priceEl = document.querySelector(
            '.price, .views-field-field-price .field-content',
          );
          if (priceEl) {
            const match = priceEl.innerText.match(/(\d+[.,]?\d*)/);
            return match ? parseFloat(match[0].replace(',', '.')) : null;
          }
          return null;
        });

        if (
          price &&
          !results.some((r) => r.name === item.name && r.price === price)
        ) {
          results.push({
            clinic: 'Regina Maria',
            name: item.name,
            price: price,
            currency: 'RON',
            url: item.url,
          });
        }
      } catch (innerErr) {
        // Trecem la următoarea analiză
      }
    }

    await page.close();
  } catch (err) {
    // Eroare la colectarea prețurilor Regina Maria
  }

  return results;
};
