import pool from '../config/database';
import { CV, CVData, CreateCVRequest, UpdateCVRequest } from '../types';

export class CVService {
    static async getAllCVsByUserId(userId: string): Promise<CV[]> {
        const result = await pool.query(
            `SELECT * FROM cvs 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
            [userId]
        );

        return result.rows;
    }

    static async getCVById(cvId: string, userId: string): Promise<CV | null> {
        const result = await pool.query(
            `SELECT * FROM cvs 
       WHERE id = $1 AND user_id = $2`,
            [cvId, userId]
        );

        return result.rows[0] || null;
    }

    static async createCV(userId: string, cvData: CreateCVRequest): Promise<CV> {
        const { title, template, data } = cvData;

        const result = await pool.query(
            `INSERT INTO cvs (user_id, title, template, data) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [userId, title, template, JSON.stringify(data)]
        );

        return result.rows[0];
    }

    static async updateCV(
        cvId: string,
        userId: string,
        updates: UpdateCVRequest
    ): Promise<CV | null> {
        const cv = await this.getCVById(cvId, userId);

        if (!cv) {
            return null;
        }

        const { title, template, data } = updates;
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (title !== undefined) {
            updateFields.push(`title = $${paramCount++}`);
            values.push(title);
        }

        if (template !== undefined) {
            updateFields.push(`template = $${paramCount++}`);
            values.push(template);
        }

        if (data !== undefined) {
            updateFields.push(`data = $${paramCount++}`);
            values.push(JSON.stringify(data));
        }

        if (updateFields.length === 0) {
            return cv;
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(cvId, userId);

        const query = `
      UPDATE cvs 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    static async deleteCV(cvId: string, userId: string): Promise<boolean> {
        const result = await pool.query(
            `DELETE FROM cvs 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
            [cvId, userId]
        );

        return result.rowCount !== null && result.rowCount > 0;
    }
}
