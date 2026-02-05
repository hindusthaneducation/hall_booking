import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🔄 Starting migration: Add logo_url to institutions...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        // Check if column exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'institutions' AND COLUMN_NAME = 'logo_url'
        `, [process.env.DB_NAME || 'hall_booking_system']);

        if (columns.length > 0) {
            console.log('✅ Column "logo_url" already exists. Skipping.');
        } else {
            console.log('➕ Adding "logo_url" column...');
            await pool.query('ALTER TABLE institutions ADD COLUMN logo_url VARCHAR(255)');
            console.log('✅ Migration successful: "logo_url" column added.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

migrate();
