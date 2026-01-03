import express from 'express';
import { getPrices } from '../controllers/price.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/prices?analysisName=Glicemie
router.get('/', protect, getPrices);

export default router;
