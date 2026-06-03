import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Durată de viață cache: 24 ore
const CACHE_TTL_HOURS = 24;

/**
 * Verifică dacă prețurile pentru analizele date sunt în cache și valide
 * @param {string[]} analysisNames - Array de nume analize
 * @returns {Object} { cached: [], missing: [] }
 */
export const checkCache = async (analysisNames) => {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - CACHE_TTL_HOURS * 60 * 60 * 1000);

  // Preia toate prețurile pentru analizele date
  const cachedPrices = await prisma.externalPrice.findMany({
    where: {
      analysisName: { in: analysisNames },
      lastUpdated: { gte: cutoffTime }, // Doar cele mai noi de 24h
    },
  });

  // Grupează după analiză
  const cachedMap = {};
  cachedPrices.forEach((price) => {
    if (!cachedMap[price.analysisName]) {
      cachedMap[price.analysisName] = [];
    }
    cachedMap[price.analysisName].push({
      clinic: price.clinicName,
      name: price.originalName,
      price: price.price,
      url: price.url,
      cached: true,
    });
  });

  // Identifică ce lipsește
  const missing = analysisNames.filter(
    (name) => !cachedMap[name] || cachedMap[name].length === 0,
  );

  return {
    cached: cachedMap,
    missing: missing,
  };
};

/**
 * Salvează prețurile în cache
 * @param {Array} results - Array de rezultate de la scraping
 * @param {string} standardName - Numele standard al analizei
 */
export const savePricesToCache = async (results, standardName) => {
  if (!results || results.length === 0) return;

  try {
    const operations = results.map((result) => {
      return prisma.externalPrice.upsert({
        where: {
          clinicName_analysisName: {
            clinicName: result.clinic,
            analysisName: standardName,
          },
        },
        update: {
          originalName: result.name,
          price: result.price,
          url: result.url,
          lastUpdated: new Date(),
        },
        create: {
          clinicName: result.clinic,
          analysisName: standardName,
          originalName: result.name,
          price: result.price,
          url: result.url,
        },
      });
    });

    await prisma.$transaction(operations);
  } catch (error) {
    // Eroare la salvarea în cache - nu afectează funcționalitatea principală
  }
};

/**
 * Invalidează cache-ul pentru o analiză (forțează re-scraping)
 * @param {string} analysisName - Numele analizei
 */
export const invalidateCache = async (analysisName) => {
  await prisma.externalPrice.deleteMany({
    where: { analysisName: analysisName },
  });
};

/**
 * Curăță prețurile mai vechi de X zile
 * @param {number} days - Număr zile
 */
export const cleanOldPrices = async (days = 7) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await prisma.externalPrice.deleteMany({
    where: {
      lastUpdated: { lt: cutoff },
    },
  });
};
