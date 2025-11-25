import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import db from '@/lib/db';

// GET /api/cvs/[id] - Get a specific CV
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const result = await db.query(
            `SELECT id, user_id, title, template, data, created_at, updated_at 
       FROM cvs 
       WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'CV not found' }, { status: 404 });
        }

        return NextResponse.json({ cv: result.rows[0] });
    } catch (error: any) {
        console.error('Get CV error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch CV' },
            { status: 500 }
        );
    }
}

// PUT /api/cvs/[id] - Update a CV
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { title, template, data } = await request.json();

        if (!title || !data) {
            return NextResponse.json(
                { error: 'Title and data are required' },
                { status: 400 }
            );
        }

        const result = await db.query(
            `UPDATE cvs 
       SET title = $1, template = $2, data = $3, updated_at = NOW() 
       WHERE id = $4 AND user_id = $5 
       RETURNING id, user_id, title, template, data, created_at, updated_at`,
            [title, template || 'modern', JSON.stringify(data), id, userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'CV not found' }, { status: 404 });
        }

        return NextResponse.json({ cv: result.rows[0] });
    } catch (error: any) {
        console.error('Update CV error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update CV' },
            { status: 500 }
        );
    }
}

// DELETE /api/cvs/[id] - Delete a CV
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const result = await db.query(
            `DELETE FROM cvs 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'CV not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete CV error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete CV' },
            { status: 500 }
        );
    }
}
