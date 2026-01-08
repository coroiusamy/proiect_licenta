import express from 'express';
import {
  getPrices,
  getPricesBatchPost,
} from '../controllers/price.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/prices?analysisName=Glicemie (single)
// GET /api/prices?analysisNames=Glicemie,Colesterol,TSH (batch)
router.get('/', protect, getPrices);

// POST /api/prices/batch (pentru liste lungi)
// Body: { analysisNames: ["Glicemie", "Colesterol", "TSH", ...] }
router.post('/batch', protect, getPricesBatchPost);

export default router;
