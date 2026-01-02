import { PrismaClient } from '@prisma/client';
import { generateWellnessAdvice } from '../services/ai.service.js';

const prisma = new PrismaClient();

// Toate tipurile de analize din sistem (PUBLIC)
export const getAllAnalysisTypes = async (req, res) => {
  try {
    const types = await prisma.analysisType.findMany({
      orderBy: {
        displayName: 'asc', // E bine să ordonezi după numele afișat
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

// ✅ OPTIMIZAT: AI DOAR pentru valori ANORMALE!
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
    // Folosim Number() și validăm că nu e NaN
    const parsedVal = Number(value);
    const numValue = value && !isNaN(parsedVal) ? parsedVal : null;

    if (numValue !== null && type.refMin !== null && type.refMax !== null) {
      if (numValue < type.refMin) status = 'low';
      else if (numValue > type.refMax) status = 'high';
    }

    console.log(
      `📊 Status calculat: ${status} (valoare: ${numValue}, interval: ${type.refMin}-${type.refMax})`
    );

    // ============================================
    // ✅ OPTIMIZARE: AI DOAR PENTRU ANORMALE!
    // ============================================
    let initialAiAdvice = null;

    // Dacă e NORMAL → mesaj generic INSTANT (fără AI!)
    if (status === 'normal' && numValue !== null) {
      initialAiAdvice = `✅ Rezultatul tău de ${numValue} ${
        type.unit || ''
      } este în intervalul normal (${type.refMin}-${
        type.refMax
      }).\n\nFelicitări! Această valoare indică o stare bună de sănătate. Continuă să menții acest echilibru prin alimentație sănătoasă și activitate fizică regulată.\n\nAcesta este un sfat informativ. Consultă medicul pentru evaluare completă.`;

      console.log(`✅ [Instant] Status NORMAL → mesaj generic (fără AI)`);
    }

    // Salvează în DB
    const newResult = await prisma.analysisResult.create({
      data: {
        userId: userId,
        analysisTypeId: Number(analysisTypeId),
        date: new Date(date),
        value: numValue,
        stringValue: stringValue || null,
        notes: notes || null,
        status: status,
        aiAdvice: initialAiAdvice, // null pentru anormale, mesaj pentru normale
      },
      include: { analysisType: true }, // Returnăm tipul ca să avem numele în frontend
    });

    // Răspunde IMEDIAT clientului 🚀
    res.status(201).json({
      message: 'Analiză adăugată cu succes!',
      data: newResult,
    });

    // ============================================
    // AI GENERARE ÎN BACKGROUND - DOAR PENTRU ANORMALE!
    // ============================================
    const finalValue = numValue !== null ? numValue : stringValue;

    if (status !== 'normal' && finalValue) {
      // 🔥 AICI AM ADĂUGAT SETTIMEOUT PENTRU SIGURANȚĂ
      setTimeout(async () => {
        try {
          console.log(
            `🚨 [Background] Status ${status.toUpperCase()} → Generăm AI pentru ID: ${
              newResult.id
            }...`
          );

          const aiAdvice = await generateWellnessAdvice(
            type.name,
            finalValue,
            type.unit || '',
            status,
            type.refMin,
            type.refMax
          );

          if (aiAdvice) {
            await prisma.analysisResult.update({
              where: { id: newResult.id },
              data: { aiAdvice: aiAdvice },
            });
            console.log(
              `✅ [Background] Sfat AI salvat pentru ID: ${newResult.id}`
            );
          } else {
            console.log(`⚠️ [Background] AI nu a generat răspuns.`);
          }
        } catch (bgError) {
          console.error(
            `❌ [Background] Eroare generare AI pentru ID: ${newResult.id}`,
            bgError
          );
        }
      }, 100); // Așteaptă 100ms ca să fie sigur că telefonul a primit răspunsul
    } else if (status === 'normal') {
      console.log(`ℹ️ [Skip AI] Status NORMAL → Mesaj deja setat.`);
    } else {
      console.log(`ℹ️ [Skip AI] Nu sunt date suficiente pentru AI.`);
    }
  } catch (error) {
    console.error('Eroare la adăugarea analizei:', error);
    // Verificăm dacă nu am trimis deja răspunsul
    if (!res.headersSent) {
      res.status(500).json({ message: 'Eroare server' });
    }
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

// Obține un singur rezultat (cu detalii)
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
