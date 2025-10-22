import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';

import {
  getAllAnalysisTypes,
  getMyResults,
  addAnalysisResult,
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
// Adaugă o analiza noua
router.post('/', protect, addAnalysisResult);

export default router;
