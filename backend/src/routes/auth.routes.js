import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
} from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register
router.post('/register', register);
// POST /api/auth/login
router.post('/login', login);
// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);
// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

export default router;
