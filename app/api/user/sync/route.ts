import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import db from '@/lib/db';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user information from Clerk (available in the request)
        // For now, we'll use a placeholder email
        const email = `${userId}@clerk.user`;

        // Insert or update user in database
        await db.query(
            `INSERT INTO users (id, email) 
       VALUES ($1, $2) 
       ON CONFLICT (id) 
       DO UPDATE SET updated_at = NOW()`,
            [userId, email]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('User sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync user' },
            { status: 500 }
        );
    }
}
