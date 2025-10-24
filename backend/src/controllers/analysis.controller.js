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
