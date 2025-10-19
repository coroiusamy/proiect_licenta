import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = 3000;

// === ENDPOINT PENTRU CREARE CONT (REGISTER) ===
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validare simplă
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email și parolă sunt obligatorii' });
    }

    // verificare user existent in sistem
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email-ul este deja folosit' });
    }

    // cripatare parola
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salvare utilizator in baza date
    const newUser = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
      },
    });

    // Raspuns succes
    res.status(201).json({
      message: 'Cont creat cu succes!',
      userId: newUser.id,
    });
  } catch (error) {
    console.error('Eroare la înregistrare:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
});

// Pornire server
app.listen(PORT, () => {
  console.log(` Serverul rulează pe http://localhost:${PORT}`);
});
