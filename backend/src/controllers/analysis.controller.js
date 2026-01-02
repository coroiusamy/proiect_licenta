import { PrismaClient } from '@prisma/client';
import { generateWellnessAdvice } from '../services/ai.service.js';

const prisma = new PrismaClient();

// Toate tipurile de analize din sistem (PUBLIC)
export const getAllAnalysisTypes = async (req, res) => {
  try {
    const types = await prisma.analysisType.findMany({
      orderBy: {
        displayName: 'asc', // Ordonat alfabetic după displayName
      },
    });
    res.status(200).json(types);
  } catch (error) {
    console.error('Eroare la preluarea tipurilor de analize:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// Aduce ISTORICUL unui singur utilizator (logat)
export const getMyResults = async (req, res) => {
  try {
    const userId = req.userId;

    const results = await prisma.analysisResult.findMany({
      where: {
        userId: userId,
      },
      include: {
        analysisType: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Eroare la preluarea rezultatelor:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// Adaugă un rezultat nou (cu AI în background + detectare severitate)
export const addAnalysisResult = async (req, res) => {
  try {
    const userId = req.userId;
    const { analysisTypeId, date, value, stringValue, notes } = req.body;

    if (!analysisTypeId || !date) {
      return res
        .status(400)
        .json({ message: 'Tipul analizei și data sunt obligatorii.' });
    }

    console.log('📝 Primire cerere adăugare analiză...');

    // Caută tipul de analiză
    const type = await prisma.analysisType.findUnique({
      where: { id: Number(analysisTypeId) },
    });

    if (!type) {
      return res.status(404).json({ message: 'Tip analiză nu există.' });
    }

    // Calculare STATUS (normal/low/high)
    let status = 'normal';
    const numValue = value ? Number(value) : null;

    if (numValue !== null && type.refMin !== null && type.refMax !== null) {
      if (numValue < type.refMin) status = 'low';
      else if (numValue > type.refMax) status = 'high';
    }

    console.log(
      `📊 Status calculat: ${status} (valoare: ${numValue}, interval: ${type.refMin}-${type.refMax})`
    );

    // Salvează în DB (aiAdvice = null inițial)
    const newResult = await prisma.analysisResult.create({
      data: {
        userId: userId,
        analysisTypeId: Number(analysisTypeId),
        date: new Date(date),
        value: numValue,
        stringValue: stringValue || null,
        notes: notes || null,
        status: status,
        aiAdvice: null,
      },
    });

    // Răspunde IMEDIAT clientului
    res.status(201).json({
      message: 'Analiză adăugată cu succes!',
      data: newResult,
    });

    // ============================================
    // AI GENERARE ÎN BACKGROUND (non-blocking!)
    // ============================================
    (async () => {
      try {
        console.log(
          `🤖 [Background] Începem generarea AI pentru ID: ${newResult.id}...`
        );

        // Generăm sfat AI DOAR dacă e numeric și avem intervale
        if (numValue !== null && type.refMin !== null && type.refMax !== null) {
          const aiAdvice = await generateWellnessAdvice(
            type.name,
            numValue,
            type.unit,
            status,
            type.refMin, // ← IMPORTANT pentru detectare severitate!
            type.refMax // ← IMPORTANT pentru detectare severitate!
          );

          if (aiAdvice) {
            // Salvăm în DB
            await prisma.analysisResult.update({
              where: { id: newResult.id },
              data: { aiAdvice: aiAdvice },
            });
            console.log(
              `✅ [Background] Sfat salvat pentru ID: ${newResult.id}`
            );
          } else {
            console.log(
              `⚠️ [Background] Nu s-a generat sfat pentru ID: ${newResult.id}`
            );
          }
        } else {
          console.log(
            `ℹ️ [Background] Skip AI pentru ID: ${newResult.id} (nu e numeric sau lipsesc intervale)`
          );
        }
      } catch (bgError) {
        console.error(
          `❌ [Background] Eroare generare AI pentru ID: ${newResult.id}`,
          bgError
        );
      }
    })();
  } catch (error) {
    console.error('Eroare la adăugarea analizei:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// Șterge un buletin de analize pe o dată specifică
export const deleteAnalysesByDate = async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res
        .status(400)
        .json({ message: 'Data lipsește sau este invalidă.' });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Data este invalidă.' });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const deleted = await prisma.analysisResult.deleteMany({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    res.status(200).json({
      message: `Șterse ${deleted.count} analize pentru data ${date}.`,
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error('Eroare la ștergerea analizelor:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// Formatează/Pregătește datele pentru graficul unei analize
export const getChartData = async (req, res) => {
  try {
    const userId = req.userId;
    const analysisTypeId = parseInt(req.params.typeId, 10);

    if (isNaN(analysisTypeId)) {
      return res
        .status(400)
        .json({ message: 'ID-ul tipului de analiză este invalid.' });
    }

    // Analiza dorită pentru userul 'x'
    const results = await prisma.analysisResult.findMany({
      where: {
        userId: userId,
        analysisTypeId: analysisTypeId,
        value: {
          not: null,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
        value: true,
      },
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Eroare la preluarea datelor pentru grafic:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// Obține un singur rezultat (cu detalii) - pentru polling
export const getAnalysisById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const result = await prisma.analysisResult.findUnique({
      where: { id: Number(id) },
      include: {
        analysisType: true,
      },
    });

    if (!result) {
      return res.status(404).json({ message: 'Analiză nu există.' });
    }

    if (result.userId !== userId) {
      return res.status(403).json({ message: 'Acces interzis.' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Eroare la preluarea analizei:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};
