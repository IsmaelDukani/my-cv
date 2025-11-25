import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '../config/clerk';

export interface AuthRequest extends Request {
    userId?: string;
    clerkUserId?: string;
}

export const requireAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized - No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        try {
            // Verify the session token with Clerk
            const session = await clerkClient.sessions.verifySession(token, token);

            if (!session || !session.userId) {
                res.status(401).json({ error: 'Unauthorized - Invalid token' });
                return;
            }

            req.clerkUserId = session.userId;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ error: 'Unauthorized - Token verification failed' });
            return;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
};
