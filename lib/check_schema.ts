import db from './db';

async function checkSchema() {
    try {
        console.log('Checking schema for users table...');
        const usersResult = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log('Users columns:', usersResult.rows);

        console.log('Checking schema for cvs table...');
        const cvsResult = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cvs';
        `);
        console.log('CVs columns:', cvsResult.rows);

    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        process.exit(0);
    }
}

checkSchema();
