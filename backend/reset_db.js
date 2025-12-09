import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function resetDB() {
    console.log('⚠️  RESETTING DATABASE - DROPPING ALL TABLES...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
        multipleStatements: true
    });

    try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
        await pool.query('DROP TABLE IF EXISTS bookings;');
        await pool.query('DROP TABLE IF EXISTS halls;');
        await pool.query('DROP TABLE IF EXISTS users;');
        await pool.query('DROP TABLE IF EXISTS departments;');
        await pool.query('DROP TABLE IF EXISTS institutions;');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('✅ All tables dropped.');
        console.log('Run "node backend/seed.js" (or restart server) to re-init schema.');
    } catch (error) {
        console.error('❌ Reset failed:', error);
    } finally {
        await pool.end();
    }
}

resetDB();
