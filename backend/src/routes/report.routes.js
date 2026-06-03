import { Router } from 'express';
import { protect, patientOnly } from '../middlewares/auth.middleware.js';
import { generateMedicalReport } from '../controllers/analysis.controller.js';

const router = Router();

// GET /api/report/generate
// Genereaza raport medical PDF
router.get('/generate', protect, patientOnly, generateMedicalReport);

export default router;
