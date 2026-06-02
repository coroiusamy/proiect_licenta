import { Router } from 'express';
import { protect, patientOnly } from '../middlewares/auth.middleware.js';

import {
  getAllAnalysisTypes,
  getMyResults,
  addAnalysisResult,
  getChartData,
  deleteAnalysesByDate,
  getHealthSummary,
} from '../controllers/analysis.controller.js';
import { uploadAnalysisFile } from '../controllers/upload.controller.js';
import multer from 'multer';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    files: 10,
    fileSize: 20 * 1024 * 1024,
  },
});

// --- Rute Publice ---
// Oricine (chiar și nelogat) poate vedea ce tipuri de analize există
router.get('/types', getAllAnalysisTypes);

// --- Rute Protejate ---
// Trebuie să fii logat (să ai un token valid) ca să accesezi ce e mai jos.

// GET /api/analyses/
//istoric analize personale
router.get('/', protect, getMyResults);

// GET /api/analyses/health-summary
// Scor de sanatate si raport AI global
router.get('/health-summary', protect, patientOnly, getHealthSummary);

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
  upload.fields([
    { name: 'analysisFile', maxCount: 1 },
    { name: 'analysisFiles', maxCount: 10 },
  ]),
  uploadAnalysisFile,
);

// DELETE /api/analyses/
//sterge un buletin de analize pe o data specifica
router.delete('/', protect, patientOnly, deleteAnalysesByDate);

export default router;
