import db from './db';

async function resetDb() {
    try {
        console.log('🗑️ Dropping existing tables...');
        await db.query('DROP TABLE IF EXISTS cvs CASCADE');
        await db.query('DROP TABLE IF EXISTS users CASCADE');
        console.log('✅ Tables dropped successfully');
    } catch (error) {
        console.error('❌ Error dropping tables:', error);
    } finally {
        process.exit(0);
    }
}

resetDb();
