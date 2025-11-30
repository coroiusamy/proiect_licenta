import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
  getUserProfile,
  updateUserProfile,
} from '../controllers/user.controller.js';

const router = Router();

// Toate rutele de aici necesită autentificare
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

export default router;
