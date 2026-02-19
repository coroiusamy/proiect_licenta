import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// === PACIENT: Generează cod de acces temporar ===
export const generateAccessCode = async (req, res) => {
  try {
    const patientId = req.userId;

    // Verifică că utilizatorul e pacient
    const user = await prisma.user.findUnique({ where: { id: patientId } });
    if (!user || user.role !== 'patient') {
      return res
        .status(403)
        .json({ message: 'Doar pacienții pot genera coduri.' });
    }

    // Invalidează codurile anterioare nefolosite
    await prisma.accessCode.updateMany({
      where: { patientId, used: false },
      data: { used: true },
    });

    // Generează un cod unic de 6 caractere (uppercase alfanumeric)
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // ex: "A3F2B1"

    const accessCode = await prisma.accessCode.create({
      data: {
        code,
        patientId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minute
      },
    });

    res.status(201).json({
      message: 'Cod generat cu succes!',
      code: accessCode.code,
      expiresAt: accessCode.expiresAt,
    });
  } catch (error) {
    console.error('Eroare la generarea codului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === PACIENT: Vezi medicii tăi ===
export const getMyDoctors = async (req, res) => {
  try {
    const patientId = req.userId;

    const links = await prisma.doctorPatient.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const doctors = links.map((link) => ({
      linkId: link.id,
      linkedAt: link.createdAt,
      ...link.doctor,
    }));

    res.status(200).json(doctors);
  } catch (error) {
    console.error('Eroare la preluarea medicilor:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === PACIENT: Revocă accesul unui medic ===
export const revokeDoctor = async (req, res) => {
  try {
    const patientId = req.userId;
    const { linkId } = req.params;

    const link = await prisma.doctorPatient.findUnique({
      where: { id: Number(linkId) },
    });

    if (!link || link.patientId !== patientId) {
      return res.status(404).json({ message: 'Legătura nu a fost găsită.' });
    }

    await prisma.doctorPatient.delete({ where: { id: Number(linkId) } });

    res.status(200).json({ message: 'Accesul medicului a fost revocat.' });
  } catch (error) {
    console.error('Eroare la revocarea accesului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === MEDIC: Introduce codul de acces ===
export const linkPatient = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Codul este obligatoriu.' });
    }

    // Caută codul
    const accessCode = await prisma.accessCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!accessCode) {
      return res.status(404).json({ message: 'Cod invalid.' });
    }

    if (accessCode.used) {
      return res.status(400).json({ message: 'Codul a fost deja folosit.' });
    }

    if (new Date() > accessCode.expiresAt) {
      return res.status(400).json({ message: 'Codul a expirat.' });
    }

    // Verifică dacă legătura există deja
    const existing = await prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: accessCode.patientId,
        },
      },
    });

    if (existing) {
      // Marchează codul ca folosit
      await prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { used: true },
      });
      return res
        .status(409)
        .json({ message: 'Pacientul este deja în lista ta.' });
    }

    // Creează legătura și marchează codul
    await prisma.$transaction([
      prisma.doctorPatient.create({
        data: {
          doctorId,
          patientId: accessCode.patientId,
        },
      }),
      prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { used: true },
      }),
    ]);

    // Preia datele pacientului pentru confirmare
    const patient = await prisma.user.findUnique({
      where: { id: accessCode.patientId },
      select: { firstName: true, lastName: true },
    });

    res.status(201).json({
      message: `Pacientul ${patient?.firstName || ''} ${patient?.lastName || ''} a fost adăugat!`,
    });
  } catch (error) {
    console.error('Eroare la asocierea pacientului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === MEDIC: Lista pacienților mei ===
export const getMyPatients = async (req, res) => {
  try {
    const doctorId = req.userId;

    const links = await prisma.doctorPatient.findMany({
      where: { doctorId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
            gender: true,
            profilePicture: true,
            weight: true,
            height: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const patients = links.map((link) => ({
      linkId: link.id,
      linkedAt: link.createdAt,
      ...link.patient,
    }));

    res.status(200).json(patients);
  } catch (error) {
    console.error('Eroare la preluarea pacienților:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === MEDIC: Vezi analizele unui pacient ===
export const getPatientAnalyses = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { patientId } = req.params;

    // Verifică legătura doctor-pacient
    const link = await prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: Number(patientId),
        },
      },
    });

    if (!link) {
      return res.status(403).json({ message: 'Nu ai acces la acest pacient.' });
    }

    const results = await prisma.analysisResult.findMany({
      where: { userId: Number(patientId) },
      include: { analysisType: true },
      orderBy: { date: 'desc' },
    });

    // Excludem aiAdvice pentru medic
    const sanitized = results.map(({ aiAdvice, ...rest }) => rest);

    res.status(200).json(sanitized);
  } catch (error) {
    console.error('Eroare la preluarea analizelor pacientului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === MEDIC: Vezi graficul unei analize a pacientului ===
export const getPatientChartData = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { patientId, typeId } = req.params;

    // Verifică legătura doctor-pacient
    const link = await prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: Number(patientId),
        },
      },
    });

    if (!link) {
      return res.status(403).json({ message: 'Nu ai acces la acest pacient.' });
    }

    const results = await prisma.analysisResult.findMany({
      where: {
        userId: Number(patientId),
        analysisTypeId: Number(typeId),
        value: { not: null },
      },
      orderBy: { date: 'asc' },
      select: { date: true, value: true },
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Eroare la preluarea graficului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// === MEDIC: Profilul unui pacient ===
export const getPatientProfile = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { patientId } = req.params;

    // Verifică legătura
    const link = await prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId: Number(patientId),
        },
      },
    });

    if (!link) {
      return res.status(403).json({ message: 'Nu ai acces la acest pacient.' });
    }

    const patient = await prisma.user.findUnique({
      where: { id: Number(patientId) },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        weight: true,
        height: true,
        profilePicture: true,
      },
    });

    if (!patient) {
      return res.status(404).json({ message: 'Pacient negăsit.' });
    }

    res.status(200).json(patient);
  } catch (error) {
    console.error('Eroare la preluarea profilului pacientului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};
