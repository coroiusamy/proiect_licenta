import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        profilePicture: true,
        authProvider: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit.' });
    }

    res.status(200).json(user);
  } catch (error) {
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
        profilePicture: true,
        authProvider: true,
      },
    });

    res.status(200).json({ message: 'Profil actualizat!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// Încărcare poză de profil
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ message: 'Nicio imagine selectată.' });
    }

    // Preia utilizatorul curent pentru a verifica avatarul vechi
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    // Șterge avatarul local vechi dacă există
    if (
      currentUser?.profilePicture &&
      currentUser.profilePicture.startsWith('/uploads/')
    ) {
      const oldPath = path.join(__dirname, '../..', currentUser.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Construiește calea URL pentru noul avatar
    const profilePicture = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture },
      select: {
        id: true,
        profilePicture: true,
      },
    });

    res.status(200).json({
      message: 'Poza de profil actualizată!',
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// Ștergere poză de profil
export const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    // Șterge fișierul local dacă există
    if (
      currentUser?.profilePicture &&
      currentUser.profilePicture.startsWith('/uploads/')
    ) {
      const filePath = path.join(
        __dirname,
        '../..',
        currentUser.profilePicture,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
    });

    res.status(200).json({ message: 'Poza de profil ștearsă.' });
  } catch (error) {
    res.status(500).json({ message: 'Eroare server.' });
  }
};
