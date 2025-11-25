import pool from '../config/database';
import { User } from '../types';

export class UserService {
    static async findOrCreateUser(clerkUserId: string, email: string): Promise<User> {
        const client = await pool.connect();

        try {
            // Check if user exists
            const existingUser = await client.query(
                'SELECT * FROM users WHERE clerk_user_id = $1',
                [clerkUserId]
            );

            if (existingUser.rows.length > 0) {
                return existingUser.rows[0];
            }

            // Create new user
            const newUser = await client.query(
                `INSERT INTO users (clerk_user_id, email) 
         VALUES ($1, $2) 
         RETURNING *`,
                [clerkUserId, email]
            );

            return newUser.rows[0];
        } finally {
            client.release();
        }
    }

    static async getUserByClerkId(clerkUserId: string): Promise<User | null> {
        const result = await pool.query(
            'SELECT * FROM users WHERE clerk_user_id = $1',
            [clerkUserId]
        );

        return result.rows[0] || null;
    }

    static async getUserById(userId: string): Promise<User | null> {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        return result.rows[0] || null;
    }
}
