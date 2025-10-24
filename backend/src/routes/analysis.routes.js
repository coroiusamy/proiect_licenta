import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';

import {
  getAllAnalysisTypes,
  getMyResults,
  addAnalysisResult,
  getChartData,
} from '../controllers/analysis.controller.js';

const router = Router();

// --- Rute Publice ---
// Oricine (chiar și nelogat) poate vedea ce tipuri de analize există
router.get('/types', getAllAnalysisTypes);

// --- Rute Protejate ---
// Trebuie să fii logat (să ai un token valid) ca să accesezi ce e mai jos.

// GET /api/analyses/
//istoric analize personale
router.get('/', protect, getMyResults);

// POST /api/analyses/
// Adauga o analiza noua
router.post('/', protect, addAnalysisResult);

// GET /api/analyses/chart/:typeId
// Incarca grafic analize
router.get('/chart/:typeId', protect, getChartData);

export default router;
