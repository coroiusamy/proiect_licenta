import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// --- Logica ÎNREGISTRARE---
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email și parolă sunt obligatorii' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email-ul este deja folosit' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
      },
    });

    res
      .status(201)
      .json({ message: 'Cont creat cu succes!', userId: newUser.id });
  } catch (error) {
    console.error('Eroare la înregistrare:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};

// --- Logica LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email și parolă sunt obligatorii' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: 'Email sau parolă incorectă' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Email sau parolă incorectă' });
    }

    // Generăm un JWT (Token)
    const token = jwt.sign(
      { userId: user.id }, // Ce punem în token (payload)
      process.env.JWT_SECRET, // Cheia secretă din .env
      { expiresIn: '7d' } // Cât timp e valabil
    );

    res.status(200).json({
      message: 'Logare reușită!',
      token: token,
      email: user.email,
    });
  } catch (error) {
    console.error('Eroare la logare:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
};
