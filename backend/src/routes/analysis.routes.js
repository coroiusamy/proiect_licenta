import { Router } from 'express';
import { protect, patientOnly } from '../middlewares/auth.middleware.js';

import {
  getAllAnalysisTypes,
  getMyResults,
  addAnalysisResult,
  getChartData,
  deleteAnalysesByDate,
} from '../controllers/analysis.controller.js';
import { uploadAnalysisFile } from '../controllers/upload.controller.js';
import multer from 'multer';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
router.post('/', protect, patientOnly, addAnalysisResult);

// GET /api/analyses/chart/:typeId
// Incarca grafic analize
router.get('/chart/:typeId', protect, getChartData);

// POST /api/analyses/upload
// Incarca fisier pentru analiza (PDF sau imagine)
router.post(
  '/upload',
  protect,
  patientOnly,
  upload.single('analysisFile'),
  uploadAnalysisFile,
);

// DELETE /api/analyses/
//sterge un buletin de analize pe o data specifica
router.delete('/', protect, patientOnly, deleteAnalysesByDate);

export default router;
