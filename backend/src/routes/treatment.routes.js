import { Router } from 'express';
import { protect, patientOnly } from '../middlewares/auth.middleware.js';
import { addTreatment, deleteTreatment } from '../controllers/treatment.controller.js';

const router = Router();

// POST /api/treatments
router.post('/', protect, patientOnly, addTreatment);

// DELETE /api/treatments/:id
router.delete('/:id', protect, patientOnly, deleteTreatment);

export default router;