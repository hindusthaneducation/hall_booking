import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixSchema() {
    console.log('🔧 FIXING SCHEMA...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
    });

    try {
        // Fix Departments
        try {
            console.log('Adding institution_id to departments...');
            await pool.query('ALTER TABLE departments ADD COLUMN institution_id VARCHAR(36);');
            await pool.query('ALTER TABLE departments ADD FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;');
            console.log('✅ departments updated.');
        } catch (e) {
            console.log('⚠️  departments update skipped (might already exist):', e.message);
        }

        // Fix Users
        try {
            console.log('Adding institution_id to users...');
            await pool.query('ALTER TABLE users ADD COLUMN institution_id VARCHAR(36);');
            await pool.query('ALTER TABLE users ADD FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;');
            console.log('✅ users updated.');
        } catch (e) {
            console.log('⚠️  users update skipped:', e.message);
        }

        // Fix Halls
        try {
            console.log('Adding institution_id to halls...');
            await pool.query('ALTER TABLE halls ADD COLUMN institution_id VARCHAR(36);'); // NOT NULL might fail if data exists
            // If data exists, we need to handle it. For now, nullable, or we update existing rows first.
            // But this is dev, so...
            console.log('✅ halls updated.');
        } catch (e) {
            console.log('⚠️  halls update skipped:', e.message);
        }

    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await pool.end();
    }
}

fixSchema();
