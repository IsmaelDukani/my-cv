import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import db from '@/lib/db';

// GET /api/cvs - List all CVs for the authenticated user
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await db.query(
            `SELECT id, user_id, title, template, data, created_at, updated_at 
       FROM cvs 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
            [userId]
        );

        return NextResponse.json({ cvs: result.rows });
    } catch (error: any) {
        console.error('List CVs error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch CVs' },
            { status: 500 }
        );
    }
}

// POST /api/cvs - Create a new CV
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, template, data } = await request.json();

        if (!title || !data) {
            return NextResponse.json(
                { error: 'Title and data are required' },
                { status: 400 }
            );
        }

        const result = await db.query(
            `INSERT INTO cvs (user_id, title, template, data) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, title, template, data, created_at, updated_at`,
            [userId, title, template || 'modern', JSON.stringify(data)]
        );

        return NextResponse.json({ cv: result.rows[0] }, { status: 201 });
    } catch (error: any) {
        console.error('Create CV error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create CV' },
            { status: 500 }
        );
    }
}
