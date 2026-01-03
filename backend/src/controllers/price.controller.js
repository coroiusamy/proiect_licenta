import { scrapePrices } from '../services/scraper.service.js';

export const getPrices = async (req, res) => {
  try {
    const { analysisName } = req.query;

    if (!analysisName) {
      return res
        .status(400)
        .json({ message: 'Numele analizei este obligatoriu.' });
    }

    // ⚠️ Scraping-ul durează (5-10 secunde).
    // În producție am folosi cache (Redis), dar pentru licență e ok live.
    const prices = await scrapePrices(analysisName);

    if (prices.length === 0) {
      return res.status(200).json({
        message: 'Nu am găsit prețuri online pentru această analiză.',
        data: [],
      });
    }

    res.status(200).json({
      message: 'Prețuri găsite!',
      data: prices,
    });
  } catch (error) {
    console.error('Price Controller Error:', error);
    res.status(500).json({ message: 'Eroare la căutarea prețurilor.' });
  }
};
