const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Starting database migration...\n');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Test connection
        console.log('📡 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful!\n');

        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Running migration...');
        await pool.query(migrationSQL);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables were created
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        console.log('📊 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        console.log('\n🎉 Database setup complete!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) {
            console.error('Details:', error.detail);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
