import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TTL: 24 ore
const CACHE_TTL_HOURS = 24;

/**
 * Verifică dacă prețurile pentru analizele date sunt în cache și valide
 * @param {string[]} analysisNames - Array de nume analize
 * @returns {Object} { cached: [], missing: [] }
 */
export const checkCache = async (analysisNames) => {
  console.log(
    `🔍 [Cache] Verificăm cache pentru ${analysisNames.length} analize...`
  );

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - CACHE_TTL_HOURS * 60 * 60 * 1000);

  // Fetch toate prețurile pentru analizele date
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
    (name) => !cachedMap[name] || cachedMap[name].length === 0
  );

  console.log(`✅ [Cache] Găsite în cache: ${Object.keys(cachedMap).length}`);
  console.log(`⚠️ [Cache] Lipsesc: ${missing.length}`);

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

  console.log(
    `💾 [Cache] Salvăm ${results.length} prețuri pentru "${standardName}"...`
  );

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
    console.log(
      `✅ [Cache] Salvate ${operations.length} prețuri pentru "${standardName}"`
    );
  } catch (error) {
    console.error(`❌ [Cache] Eroare salvare:`, error);
  }
};

/**
 * Invalidează cache-ul pentru o analiză (forțează re-scraping)
 * @param {string} analysisName - Numele analizei
 */
export const invalidateCache = async (analysisName) => {
  const result = await prisma.externalPrice.deleteMany({
    where: { analysisName: analysisName },
  });
  console.log(
    `🗑️ [Cache] Invalidat cache pentru "${analysisName}" - ${result.count} intrări șterse`
  );
};

/**
 * Curăță prețurile mai vechi de X zile
 * @param {number} days - Număr zile
 */
export const cleanOldPrices = async (days = 7) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await prisma.externalPrice.deleteMany({
    where: {
      lastUpdated: { lt: cutoff },
    },
  });

  console.log(
    `🧹 [Cache] Șterse ${result.count} prețuri mai vechi de ${days} zile`
  );
};
