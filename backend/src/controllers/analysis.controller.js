import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Toate analizele din sisteam
export const getAllAnalysisTypes = async (req, res) => {
  try {
    const types = await prisma.analysisType.findMany({
      orderBy: {
        name: 'asc', // Ordonat alfabetic
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
        userId: userId, // Gaseste doar rezultatele userului logat
      },

      // detaliile despre tipul analizei (nume, unitate, refMin/Max)
      include: {
        analysisType: true,
      },
      orderBy: {
        date: 'desc', // Cele mai noi primele
      },
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Eroare la preluarea rezultatelor:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// Adauga un rezultat nou (pentru userul logat)
export const addAnalysisResult = async (req, res) => {
  try {
    const userId = req.userId;

    // datele din formularul trimis de aplicația mobilă
    const { analysisTypeId, date, value, stringValue, notes } = req.body;

    if (!analysisTypeId || !date) {
      return res
        .status(400)
        .json({ message: 'Tipul analizei și data sunt obligatorii.' });
    }

    // Introducerea noilor rezultate in tabel
    const newResult = await prisma.analysisResult.create({
      data: {
        userId: userId, // ID-ul userului logat
        analysisTypeId: Number(analysisTypeId), // ID-ul analizei (ex: 5 pt Glicemie)
        date: new Date(date), // Convertim string-ul datei în obiect Date
        value: value ? Number(value) : null,
        stringValue: stringValue || null,
        notes: notes || null,
      },
    });

    res
      .status(201)
      .json({ message: 'Analiză adăugată cu succes!', data: newResult });
  } catch (error) {
    console.error('Eroare la adăugarea analizei:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

//sterge un buletin de analize pe o data specifica
export const deleteAnalysesByDate = async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res
        .status(400)
        .json({ message: 'Data lipsește sau este invalidă.' });
    }

    // Convertim data ISO primită într-un obiect Date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Formatul datei este invalid.' });
    }

    // (ex: 25.11.2020 ora 00:00:00)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(
      `Backend: Se șterg analizele pentru UserID: ${userId} între ${startOfDay.toISOString()} și ${endOfDay.toISOString()}`
    );

    // Folosim 'deleteMany' pentru a șterge toate intrările
    const deleteResult = await prisma.analysisResult.deleteMany({
      where: {
        userId: userId, // Doar al userului logat
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    res.status(200).json({
      message: `Buletinul de analize din ${targetDate.toLocaleDateString(
        'ro-RO'
      )} a fost șters.`,
      count: deleteResult.count,
    });
  } catch (error) {
    console.error('Eroare la ștergerea analizelor:', error);
    res.status(500).json({ message: 'Eroare server la ștergere.' });
  }
};

//Formateaza/Pregateste datele pentru graficul unei analize
export const getChartData = async (req, res) => {
  try {
    const userId = req.userId;
    const analysisTypeId = parseInt(req.params.typeId, 10);

    if (isNaN(analysisTypeId)) {
      return res
        .status(400)
        .json({ message: 'ID-ul tipului de analiză este invalid.' });
    }

    // Analiza dorita petntru userul 'x'
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
