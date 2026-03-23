import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { isValidEmail, isStrongPassword } from '../utils/validation.js';
import { sendResetEmail } from '../services/emailService.js';

const prisma = new PrismaClient();
const TOKEN_EXPIRATION = '7d';

// --- ÎNREGISTRARE ---
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, specialty } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Date incomplete.' });
    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Email invalid.' });
    if (!isStrongPassword(password))
      return res
        .status(400)
        .json({ message: 'Parola slabă (min 8, majusculă, cifră).' });

    const validRole = role === 'doctor' ? 'doctor' : 'patient';

    if (validRole === 'doctor' && !specialty) {
      return res
        .status(400)
        .json({ message: 'Specializarea este obligatorie pentru medici.' });
    }

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
        role: validRole,
        specialty: validRole === 'doctor' ? specialty : null,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION },
    );
    res.status(201).json({
      message: 'Cont creat!',
      token,
      user: { id: newUser.id, email, role: newUser.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- AUTENTIFICARE ---
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

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION },
    );
    res.status(200).json({
      message: 'Logat!',
      token,
      user: { email: user.email, firstName: user.firstName, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- AUTENTIFICARE GOOGLE ---
export const googleAuth = async (req, res) => {
  try {
    const { idToken, accessToken, code, redirectUri, codeVerifier } = req.body;

    let googleUserInfo = null;

    // Metoda 1: idToken de la autentificarea nativă Google
    if (idToken) {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      const payload = await response.json();

      if (payload.error || !payload.email) {
        return res.status(401).json({ message: 'Token Google invalid.' });
      }

      // Verifică dacă token-ul este pentru aplicația noastră
      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res
          .status(401)
          .json({ message: 'Token Google invalid pentru această aplicație.' });
      }

      googleUserInfo = {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || null,
        lastName: payload.family_name || null,
        profilePicture: payload.picture || null,
      };
    }
    // Metoda 2: flux cu cod PKCE (pentru web/Expo Go)
    else if (code) {
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
        return res
          .status(401)
          .json({ message: 'Eroare la autentificarea Google.' });
      }

      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo`,
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
      );
      const payload = await response.json();

      if (payload.error || !payload.email) {
        return res.status(401).json({ message: 'Token Google invalid.' });
      }

      googleUserInfo = {
        googleId: payload.id,
        email: payload.email,
        firstName: payload.given_name || null,
        lastName: payload.family_name || null,
        profilePicture: payload.picture || null,
      };
    }
    // Metoda 3: accessToken direct
    else if (accessToken) {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const payload = await response.json();

      if (payload.error || !payload.email) {
        return res.status(401).json({ message: 'Token Google invalid.' });
      }

      googleUserInfo = {
        googleId: payload.id,
        email: payload.email,
        firstName: payload.given_name || null,
        lastName: payload.family_name || null,
        profilePicture: payload.picture || null,
      };
    } else {
      return res.status(400).json({ message: 'Token Google lipsă.' });
    }

    const { googleId, email, firstName, lastName, profilePicture } =
      googleUserInfo;

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
          data: { googleId, profilePicture },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            firstName,
            lastName,
            profilePicture,
            authProvider: 'google',
          },
        });
      }
    } else {
      // Actualizează poza de profil la fiecare autentificare (dacă s-a schimbat)
      if (profilePicture && user.profilePicture !== profilePicture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { profilePicture },
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION },
    );

    res.status(200).json({
      message: 'Autentificare reușită!',
      token,
      user: { email: user.email, firstName: user.firstName, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- PAROLĂ UITATĂ ---
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
    res.status(500).json({ message: 'Eroare server.' });
  }
};

// --- RESETARE PAROLĂ ---
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
    res.status(500).json({ message: 'Eroare server.' });
  }
};
