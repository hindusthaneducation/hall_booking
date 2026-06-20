import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend .env
dotenv.config({ path: path.join(__dirname, '.env') });

async function clearBookingsOnly() {
    console.log('⚠️  CLEARING TEST BOOKINGS & PRESS RELEASES ONLY...');
    console.log(`📡 Connecting to DB at ${process.env.DB_HOST}:${process.env.DB_PORT}...`);

    const dbName = process.env.DB_NAME || 'hall_booking_system';

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
        multipleStatements: true
    });

    try {
        // Disable foreign keys temporarily to truncate safely
        await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
        
        console.log('🧹 Truncating press_releases table...');
        await pool.query('TRUNCATE TABLE press_releases;');
        
        console.log('🧹 Truncating bookings table...');
        await pool.query('TRUNCATE TABLE bookings;');
        
        // Re-enable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('✅ Success: All test bookings and press releases have been cleared!');
        console.log('✨ Users, Halls, Departments, and Settings have been preserved.');
    } catch (error) {
        console.error('❌ Failed to clear bookings:', error.message);
        await pool.end();
        process.exit(1);
    } finally {
        await pool.end();
    }
    process.exit(0);
}

clearBookingsOnly();
