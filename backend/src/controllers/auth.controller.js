import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { isValidEmail, isStrongPassword } from '../utils/validation.js';
import { sendResetEmail } from '../services/emailService.js';

const prisma = new PrismaClient();
const TOKEN_EXPIRATION = '7d';

// --- REGISTER ---
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Date incomplete.' });
    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Email invalid.' });
    if (!isStrongPassword(password))
      return res
        .status(400)
        .json({ message: 'Parola slabă (min 8, majusculă, cifră).' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(409).json({ message: 'Email existent.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName },
    });

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });
    res
      .status(201)
      .json({ message: 'Cont creat!', token, user: { id: newUser.id, email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Date incorecte.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });
    res
      .status(200)
      .json({
        message: 'Logat!',
        token,
        user: { email: user.email, firstName: user.firstName },
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return res
        .status(200)
        .json({ message: 'Instrucțiunile au fost trimise.' });

    // Cod scurt de 6 cifre
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minute

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    await sendResetEmail(user.email, resetToken);
    res.status(200).json({ message: 'Instrucțiunile au fost trimise.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!isStrongPassword(newPassword))
      return res.status(400).json({ message: 'Parola e prea slabă.' });

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user)
      return res.status(400).json({ message: 'Cod invalid sau expirat.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(200).json({ message: 'Parolă schimbată!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};
