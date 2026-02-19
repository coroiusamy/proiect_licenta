import { Router } from 'express';
import {
  protect,
  patientOnly,
  doctorOnly,
} from '../middlewares/auth.middleware.js';

import {
  generateAccessCode,
  getMyDoctors,
  revokeDoctor,
  linkPatient,
  getMyPatients,
  getPatientAnalyses,
  getPatientChartData,
  getPatientProfile,
} from '../controllers/doctor.controller.js';

const router = Router();

// ─── PACIENT: Cod de acces & gestionare medici ───
router.post('/access-code', protect, patientOnly, generateAccessCode);
router.get('/my-doctors', protect, patientOnly, getMyDoctors);
router.delete('/my-doctors/:linkId', protect, patientOnly, revokeDoctor);

// ─── MEDIC: Conectare pacient & vizualizare date ───
router.post('/link-patient', protect, doctorOnly, linkPatient);
router.get('/my-patients', protect, doctorOnly, getMyPatients);
router.get('/patient/:patientId', protect, doctorOnly, getPatientProfile);
router.get(
  '/patient/:patientId/analyses',
  protect,
  doctorOnly,
  getPatientAnalyses,
);
router.get(
  '/patient/:patientId/chart/:typeId',
  protect,
  doctorOnly,
  getPatientChartData,
);

export default router;
