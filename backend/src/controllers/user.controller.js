import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Obține profilul utilizatorului curent
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        weight: true,
        height: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Eroare la preluarea profilului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// Actualizează profilul
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { firstName, lastName, dateOfBirth, gender, weight, height } =
      req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined, // Convertim string la Date
        gender,
        weight: weight ? parseFloat(weight) : null, // Asigurăm că e număr
        height: height ? parseFloat(height) : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        weight: true,
        height: true,
      },
    });

    res.status(200).json({ message: 'Profil actualizat!', user: updatedUser });
  } catch (error) {
    console.error('Eroare la actualizarea profilului:', error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};
