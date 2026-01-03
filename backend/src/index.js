import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import userRoutes from './routes/user.routes.js';
import priceRoutes from './routes/price.routes.js';

dotenv.config();

const app = express();

// Middleware-uri
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- ÎNCĂRCAREA RUTELOR ---
app.use('/api/auth', authRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/user', userRoutes);
app.use('/api/prices', priceRoutes);

// Pornire server
app.listen(PORT, () => {
  console.log(`🚀 Serverul (modular) rulează pe http://localhost:${PORT}`);
});
