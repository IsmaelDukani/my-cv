import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserService } from '../services/userService';
import { clerkClient } from '../config/clerk';

export class UserController {
    static async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const clerkUserId = req.clerkUserId!;

            const user = await UserService.getUserByClerkId(clerkUserId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ user });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to fetch user profile' });
        }
    }

    static async syncUser(req: AuthRequest, res: Response): Promise<void> {
        try {
            const clerkUserId = req.clerkUserId!;

            // Get user info from Clerk
            const clerkUser = await clerkClient.users.getUser(clerkUserId);

            if (!clerkUser) {
                res.status(404).json({ error: 'Clerk user not found' });
                return;
            }

            const email = clerkUser.emailAddresses[0]?.emailAddress || '';

            // Create or update user in our database
            const user = await UserService.findOrCreateUser(clerkUserId, email);

            res.json({ user });
        } catch (error) {
            console.error('Sync user error:', error);
            res.status(500).json({ error: 'Failed to sync user' });
        }
    }
}
