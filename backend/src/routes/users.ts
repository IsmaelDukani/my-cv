import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/user/profile - Get current user profile
router.get('/profile', UserController.getProfile);

// POST /api/user/sync - Sync user from Clerk
router.post('/sync', UserController.syncUser);

export default router;
