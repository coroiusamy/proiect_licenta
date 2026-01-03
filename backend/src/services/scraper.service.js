import puppeteer from 'puppeteer';
import { scrapeSynevo } from './scrapers/synevo.js';
import { scrapeBioclinica } from './scrapers/bioclinica.js';
import { scrapeSante } from './scrapers/sante.js';
import { scrapeReginaMaria } from './scrapers/reginamaria.js';
import { scrapeMedlife } from './scrapers/medlife.js';

// ==================================================
//  FUNCȚIE AJUTĂTOARE: Curățare Avansată
// ==================================================
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

export const scrapePrices = async (analysisName) => {
  console.log(`🔎 [Main] Start căutare: "${analysisName}"`);

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
        scrapeSynevo(browser, analysisName),
        scrapeBioclinica(browser, analysisName),
        scrapeSante(browser, analysisName),
        scrapeReginaMaria(browser, analysisName),
        scrapeMedlife(browser, analysisName),
      ]);

    // 3. COMBINĂM TOATE
    rawResults = [
      ...(synevoData || []),
      ...(bioclinicaData || []),
      ...(santeData || []),
      ...(reginaData || []),
      ...(medlifeData || []),
    ];
  } catch (error) {
    console.error('❌ Main Error:', error);
  } finally {
    if (browser) await browser.close();
  }

  // ==================================================
  //  FILTRARE INTELIGENTĂ
  // ==================================================
  console.log(
    `   📊 Rezultate brute: ${rawResults.length}. Începem filtrarea...`
  );

  const normalizedQuery = normalizeText(analysisName);
  const queryTokens = normalizedQuery.split(' ').filter((w) => w.length > 2);
  let finalResults = rawResults;

  if (queryTokens.length > 1) {
    const filtered = rawResults.filter((item) => {
      const normalizedItemName = normalizeText(item.name);
      const itemTokens = normalizedItemName.split(' ');
      return queryTokens.every((token) => itemTokens.includes(token));
    });

    if (filtered.length > 0) {
      console.log(
        `   ✅ Filtrare specifică activă. Păstrat: ${filtered.length} rezultate.`
      );
      finalResults = filtered;
    } else {
      console.log(
        `   ⚠️ Filtrarea strictă a eliminat tot. Încercăm fallback relaxat...`
      );
      const relaxedFilter = rawResults.filter((item) => {
        const normalizedItemName = normalizeText(item.name);
        return queryTokens.every((token) => normalizedItemName.includes(token));
      });
      if (relaxedFilter.length > 0) finalResults = relaxedFilter;
    }
  }

  return finalResults.sort((a, b) => a.price - b.price);
};
