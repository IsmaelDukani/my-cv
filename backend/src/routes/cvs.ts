import { Router } from 'express';
import { CVController } from '../controllers/cvController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/cvs - Get all CVs for authenticated user
router.get('/', CVController.getAllCVs);

// GET /api/cvs/:id - Get specific CV
router.get('/:id', CVController.getCVById);

// POST /api/cvs - Create new CV
router.post('/', CVController.createCV);

// PUT /api/cvs/:id - Update CV
router.put('/:id', CVController.updateCV);

// DELETE /api/cvs/:id - Delete CV
router.delete('/:id', CVController.deleteCV);

export default router;
