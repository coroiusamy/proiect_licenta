import {
  scrapePrices,
  scrapePricesBatch,
  calculatePackages,
} from '../services/scraper_multi.service.js';

/**
 * GET /api/prices?analysisName=Glicemie (single)
 * GET /api/prices?analysisNames=Glicemie,Colesterol,TSH (batch)
 */
export const getPrices = async (req, res) => {
  try {
    const { analysisName, analysisNames } = req.query;

    // BATCH MODE (multiple analize)
    if (analysisNames) {
      const names = analysisNames
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (names.length === 0) {
        return res
          .status(400)
          .json({ message: 'Lista de analize este goală.' });
      }

      console.log(`📦 [Controller] Batch request: ${names.length} analize`);

      // Scrape toate analizele (cu cache)
      const batchResults = await scrapePricesBatch(names);

      // Calculează pachete (preț total per clinică)
      const packages = calculatePackages(batchResults);

      if (packages.length === 0) {
        return res.status(200).json({
          message:
            'Nu am găsit nicio clinică care să ofere TOATE analizele din pachet.',
          mode: 'batch',
          data: [],
        });
      }

      return res.status(200).json({
        message: `Găsite ${packages.length} pachete complete!`,
        mode: 'batch',
        analysisCount: names.length,
        data: packages,
      });
    }

    // SINGLE MODE (o singură analiză)
    if (analysisName) {
      console.log(`🔍 [Controller] Single request: "${analysisName}"`);

      const prices = await scrapePrices(analysisName);

      if (prices.length === 0) {
        return res.status(200).json({
          message: 'Nu am găsit prețuri pentru această analiză.',
          mode: 'single',
          data: [],
        });
      }

      return res.status(200).json({
        message: 'Prețuri găsite!',
        mode: 'single',
        data: prices,
      });
    }

    // Niciun parametru
    return res.status(400).json({
      message:
        'Parametru lipsă. Folosește: ?analysisName=X sau ?analysisNames=X,Y,Z',
    });
  } catch (error) {
    console.error('❌ [Controller] Eroare:', error);
    res.status(500).json({ message: 'Eroare la căutarea prețurilor.' });
  }
};

/**
 * POST /api/prices/batch (alternativă pentru liste lungi)
 * Body: { analysisNames: ["Glicemie", "Colesterol", "TSH"] }
 */
export const getPricesBatchPost = async (req, res) => {
  try {
    const { analysisNames } = req.body;

    if (
      !analysisNames ||
      !Array.isArray(analysisNames) ||
      analysisNames.length === 0
    ) {
      return res
        .status(400)
        .json({ message: 'Lista de analize este invalidă.' });
    }

    console.log(
      `📦 [Controller POST] Batch request: ${analysisNames.length} analize`
    );

    const batchResults = await scrapePricesBatch(analysisNames);
    const packages = calculatePackages(batchResults);

    if (packages.length === 0) {
      return res.status(200).json({
        message: 'Nu am găsit nicio clinică care să ofere TOATE analizele.',
        mode: 'batch',
        data: [],
      });
    }

    return res.status(200).json({
      message: `Găsite ${packages.length} pachete complete!`,
      mode: 'batch',
      analysisCount: analysisNames.length,
      data: packages,
    });
  } catch (error) {
    console.error('❌ [Controller POST] Eroare:', error);
    res.status(500).json({ message: 'Eroare la căutarea prețurilor.' });
  }
};
