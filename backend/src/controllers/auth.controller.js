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
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        authProvider: 'local',
      },
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

    if (!user) {
      return res.status(401).json({ message: 'Date incorecte.' });
    }

    if (user.authProvider === 'google') {
      return res
        .status(400)
        .json({ message: 'Folosește Google pentru a te autentifica.' });
    }

    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Date incorecte.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });
    res.status(200).json({
      message: 'Logat!',
      token,
      user: { email: user.email, firstName: user.firstName },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- GOOGLE AUTH ---
export const googleAuth = async (req, res) => {
  try {
    const { accessToken, code, redirectUri, codeVerifier } = req.body;

    let googleAccessToken = accessToken;

    if (code && !accessToken) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Google token exchange error:', tokenData);
        return res
          .status(401)
          .json({ message: 'Eroare la autentificarea Google.' });
      }

      googleAccessToken = tokenData.access_token;
    }

    if (!googleAccessToken) {
      return res.status(400).json({ message: 'Token Google lipsă.' });
    }

    const response = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo`,
      {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      },
    );
    const payload = await response.json();

    if (payload.error || !payload.email) {
      return res.status(401).json({ message: 'Token Google invalid.' });
    }

    const {
      id: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
    } = payload;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        if (user.authProvider === 'local') {
          return res.status(409).json({
            message:
              'Există deja un cont cu acest email. Autentifică-te cu parola.',
          });
        }
        user = await prisma.user.update({
          where: { email },
          data: { googleId },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            firstName: firstName || null,
            lastName: lastName || null,
            authProvider: 'google',
          },
        });
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });

    res.status(200).json({
      message: 'Autentificare reușită!',
      token,
      user: { email: user.email, firstName: user.firstName },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
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
