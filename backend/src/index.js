import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import userRoutes from './routes/user.routes.js';
import priceRoutes from './routes/price.routes.js';
import doctorRoutes from './routes/doctor.routes.js';

dotenv.config();

process.on('uncaughtException', (error) => {
  console.error('[Server] uncaughtException', {
    message: error?.message,
    stack: error?.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] unhandledRejection', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware-uri
app.use(cors());
app.use(express.json());

// Servire fișiere statice (avatare)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const PORT = process.env.PORT || 3000;

// --- ÎNCĂRCAREA RUTELOR ---
app.use('/api/auth', authRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/user', userRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/doctor', doctorRoutes);

// Pornire server
app.listen(PORT, () => {
  console.log(`🚀 Serverul (modular) rulează pe http://localhost:${PORT}`);
});
