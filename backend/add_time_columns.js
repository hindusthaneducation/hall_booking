import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addTimeColumns() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
    });

    try {
        console.log('⏳ Adding start_time and end_time to bookings...');
        // Add columns if they don't exist
        await pool.query('ALTER TABLE bookings ADD COLUMN start_time TIME, ADD COLUMN end_time TIME;');
        console.log('✅ Columns added.');
    } catch (e) {
        console.log('⚠️  Columns might already exist:', e.message);
    } finally {
        await pool.end();
    }
}

addTimeColumns();
