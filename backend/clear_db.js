import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './init_db.js';
import { seed } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we load .env from the backend directory specifically
dotenv.config({ path: path.join(__dirname, '.env') });

async function clearDB() {
    console.log('⚠️  CLEARING DATABASE - DROPPING ALL TABLES...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
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
        await pool.query('DROP TABLE IF EXISTS settings;');
        await pool.query('DROP TABLE IF EXISTS press_releases;');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('✅ All tables dropped.');
    } catch (error) {
        console.error('❌ Reset failed:', error);
        await pool.end();
        process.exit(1);
    } finally {
        await pool.end();
    }

    console.log('🔄 Re-initializing database schema...');
    try {
        await initDB();
        console.log('✅ Schema initialized successfully.');
    } catch (error) {
        console.error('❌ Schema initialization failed:', error);
        process.exit(1);
    }

    console.log('🌱 Seeding default database data...');
    try {
        await seed();
        console.log('✅ Database seeded successfully.');
    } catch (error) {
        console.error('❌ Seeding database failed:', error);
        process.exit(1);
    }

    console.log('🎉 Database cleared, re-initialized, and seeded successfully!');
    process.exit(0);
}

clearDB();
