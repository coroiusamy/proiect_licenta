import puppeteer from 'puppeteer';
import { scrapeSynevo } from './scrapers/synevo.js';
import { scrapeBioclinica } from './scrapers/bioclinica.js';
import { scrapeSante } from './scrapers/sante.js';
import { scrapeReginaMaria } from './scrapers/reginamaria.js';
import { scrapeMedlife } from './scrapers/medlife.js';
import { checkCache, savePricesToCache } from './cache.service.js';

// Normalizare text
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Filtrare inteligentă
const filterResults = (rawResults, analysisName) => {
  const normalizedQuery = normalizeText(analysisName);
  const queryTokens = normalizedQuery.split(' ').filter((w) => w.length > 2);

  if (queryTokens.length <= 1) return rawResults;

  const filtered = rawResults.filter((item) => {
    const normalizedItemName = normalizeText(item.name);
    const itemTokens = normalizedItemName.split(' ');
    return queryTokens.every((token) => itemTokens.includes(token));
  });

  if (filtered.length > 0) return filtered;

  // Fallback relaxat
  const relaxed = rawResults.filter((item) => {
    const normalizedItemName = normalizeText(item.name);
    return queryTokens.every((token) => normalizedItemName.includes(token));
  });

  return relaxed.length > 0 ? relaxed : rawResults;
};

/**
 * Scrape prețuri pentru O SINGURĂ analiză (cu cache)
 */
export const scrapePrices = async (analysisName) => {
  console.log(`🔎 [Scraper] Căutare: "${analysisName}"`);

  // 1. Verifică cache
  const { cached, missing } = await checkCache([analysisName]);

  if (cached[analysisName] && cached[analysisName].length > 0) {
    console.log(
      `✅ [Scraper] Găsit în cache: ${cached[analysisName].length} prețuri`
    );
    return cached[analysisName].sort((a, b) => a.price - b.price);
  }

  // 2. Scraping live
  console.log(`🌐 [Scraper] Cache miss. Scraping live...`);
  let rawResults = [];
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const [synevoData, bioclinicaData, santeData, reginaData, medlifeData] =
      await Promise.all([
        scrapeSynevo(browser, analysisName).catch(() => []),
        scrapeBioclinica(browser, analysisName).catch(() => []),
        scrapeSante(browser, analysisName).catch(() => []),
        scrapeReginaMaria(browser, analysisName).catch(() => []),
        scrapeMedlife(browser, analysisName).catch(() => []),
      ]);

    rawResults = [
      ...(synevoData || []),
      ...(bioclinicaData || []),
      ...(santeData || []),
      ...(reginaData || []),
      ...(medlifeData || []),
    ];
  } catch (error) {
    console.error('❌ [Scraper] Eroare:', error);
  } finally {
    if (browser) await browser.close();
  }

  // 3. Filtrare
  const filtered = filterResults(rawResults, analysisName);

  // 4. Salvează în cache
  if (filtered.length > 0) {
    await savePricesToCache(filtered, analysisName);
  }

  return filtered.sort((a, b) => a.price - b.price);
};

/**
 * Scrape prețuri pentru MULTIPLE analize (batch cu cache)
 */
export const scrapePricesBatch = async (analysisNames) => {
  console.log(
    `📦 [Scraper Batch] Start pentru ${analysisNames.length} analize...`
  );

  // 1. Verifică cache pentru toate
  const { cached, missing } = await checkCache(analysisNames);

  // 2. Scrape doar ce lipsește
  const freshResults = {};

  if (missing.length > 0) {
    console.log(
      `🌐 [Scraper Batch] Scraping ${missing.length} analize lipsă...`
    );

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // Scrape TOATE analizele lipsă SIMULTAN
      const scrapePromises = missing.map(async (analysisName) => {
        try {
          const [synevo, bioclinica, sante, regina, medlife] =
            await Promise.all([
              scrapeSynevo(browser, analysisName).catch(() => []),
              scrapeBioclinica(browser, analysisName).catch(() => []),
              scrapeSante(browser, analysisName).catch(() => []),
              scrapeReginaMaria(browser, analysisName).catch(() => []),
              scrapeMedlife(browser, analysisName).catch(() => []),
            ]);

          const raw = [
            ...synevo,
            ...bioclinica,
            ...sante,
            ...regina,
            ...medlife,
          ];
          const filtered = filterResults(raw, analysisName);

          // Salvează în cache
          if (filtered.length > 0) {
            await savePricesToCache(filtered, analysisName);
          }

          return { analysisName, results: filtered };
        } catch (err) {
          console.error(
            `❌ [Scraper Batch] Eroare pentru "${analysisName}":`,
            err.message
          );
          return { analysisName, results: [] };
        }
      });

      const scraped = await Promise.all(scrapePromises);

      scraped.forEach(({ analysisName, results }) => {
        freshResults[analysisName] = results;
      });
    } catch (error) {
      console.error('❌ [Scraper Batch] Eroare fatală:', error);
    } finally {
      if (browser) await browser.close();
    }
  }

  // 3. Combină cache + fresh
  const allResults = { ...cached, ...freshResults };

  console.log(
    `✅ [Scraper Batch] Finalizat! Total analize: ${
      Object.keys(allResults).length
    }`
  );

  return allResults;
};

/**
 * Calculează pachete (prețuri totale per clinică)
 */
export const calculatePackages = (batchResults) => {
  console.log('📊 [Calculator] Calculăm pachete...');

  const clinics = ['Synevo', 'Regina Maria', 'MedLife', 'Bioclinica', 'Sante'];
  const packages = [];

  clinics.forEach((clinic) => {
    let totalPrice = 0;
    const analyses = [];
    let allFound = true;

    // Pentru fiecare analiză din batch, caută prețul la clinica curentă
    Object.entries(batchResults).forEach(([analysisName, results]) => {
      const clinicResult = results.find((r) => r.clinic === clinic);

      if (clinicResult) {
        totalPrice += clinicResult.price;
        analyses.push({
          name: analysisName,
          originalName: clinicResult.name,
          price: clinicResult.price,
          url: clinicResult.url,
        });
      } else {
        allFound = false;
      }
    });

    // Doar dacă clinica are TOATE analizele din pachet
    if (allFound && analyses.length > 0) {
      packages.push({
        clinic: clinic,
        totalPrice: totalPrice,
        analysisCount: analyses.length,
        analyses: analyses,
      });
    }
  });

  // Sortează după preț total
  packages.sort((a, b) => a.totalPrice - b.totalPrice);

  console.log(`✅ [Calculator] Găsite ${packages.length} pachete complete`);

  return packages;
};
