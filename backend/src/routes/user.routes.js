import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect } from '../middlewares/auth.middleware.js';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  deleteProfilePicture,
} from '../controllers/user.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurare multer pentru upload avatare
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.userId}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Tip de fișier invalid. Doar JPEG, PNG și WebP sunt permise.'),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = Router();

// Toate rutele de aici necesită autentificare
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post(
  '/profile/avatar',
  protect,
  upload.single('avatar'),
  uploadProfilePicture,
);
router.delete('/profile/avatar', protect, deleteProfilePicture);

export default router;
