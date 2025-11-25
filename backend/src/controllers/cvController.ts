import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CVService } from '../services/cvService';
import { UserService } from '../services/userService';
import { CreateCVRequest, UpdateCVRequest } from '../types';

export class CVController {
    static async getAllCVs(req: AuthRequest, res: Response): Promise<void> {
        try {
            const clerkUserId = req.clerkUserId!;

            // Get or create user in our database
            const user = await UserService.getUserByClerkId(clerkUserId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const cvs = await CVService.getAllCVsByUserId(user.id);
            res.json({ cvs });
        } catch (error) {
            console.error('Get all CVs error:', error);
            res.status(500).json({ error: 'Failed to fetch CVs' });
        }
    }

    static async getCVById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const clerkUserId = req.clerkUserId!;

            const user = await UserService.getUserByClerkId(clerkUserId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const cv = await CVService.getCVById(id, user.id);

            if (!cv) {
                res.status(404).json({ error: 'CV not found' });
                return;
            }

            res.json({ cv });
        } catch (error) {
            console.error('Get CV error:', error);
            res.status(500).json({ error: 'Failed to fetch CV' });
        }
    }

    static async createCV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const clerkUserId = req.clerkUserId!;
            const cvData: CreateCVRequest = req.body;

            // Validate request body
            if (!cvData.title || !cvData.template || !cvData.data) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const user = await UserService.getUserByClerkId(clerkUserId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const cv = await CVService.createCV(user.id, cvData);
            res.status(201).json({ cv });
        } catch (error) {
            console.error('Create CV error:', error);
            res.status(500).json({ error: 'Failed to create CV' });
        }
    }

    static async updateCV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const clerkUserId = req.clerkUserId!;
            const updates: UpdateCVRequest = req.body;

            const user = await UserService.getUserByClerkId(clerkUserId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const cv = await CVService.updateCV(id, user.id, updates);

            if (!cv) {
                res.status(404).json({ error: 'CV not found' });
                return;
            }

            res.json({ cv });
        } catch (error) {
            console.error('Update CV error:', error);
            res.status(500).json({ error: 'Failed to update CV' });
        }
    }

    static async deleteCV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const clerkUserId = req.clerkUserId!;

            const user = await UserService.getUserByClerkId(clerkUserId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const deleted = await CVService.deleteCV(id, user.id);

            if (!deleted) {
                res.status(404).json({ error: 'CV not found' });
                return;
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Delete CV error:', error);
            res.status(500).json({ error: 'Failed to delete CV' });
        }
    }
}
