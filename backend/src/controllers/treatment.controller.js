import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const addTreatment = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, startDate, endDate, analysisTypeId } = req.body;

    if (!name || !startDate || !analysisTypeId) {
      return res
        .status(400)
        .json({ message: 'Nume, Dată și Tipul analizei sunt obligatorii.' });
    }

    const treatment = await prisma.treatment.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        userId,
        analysisTypeId: parseInt(analysisTypeId, 10),
      },
    });

    res
      .status(201)
      .json({ message: 'Tratament adăugat cu succes!', treatment });
  } catch (error) {
    console.error('Error addTreatment:', error);
    res.status(500).json({ message: 'Eroare la adăugarea tratamentului' });
  }
};

export const deleteTreatment = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const treatment = await prisma.treatment.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!treatment) {
      return res.status(404).json({ message: 'Tratamentul nu a fost găsit.' });
    }

    if (treatment.userId !== userId) {
      return res.status(403).json({ message: 'Acces interzis.' });
    }

    await prisma.treatment.delete({
      where: { id: parseInt(id, 10) },
    });

    res.status(200).json({ message: 'Tratament șters cu succes' });
  } catch (error) {
    console.error('Error deleteTreatment:', error);
    res.status(500).json({ message: 'Eroare la ștergerea tratamentului' });
  }
};
