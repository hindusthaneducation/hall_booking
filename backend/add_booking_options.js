import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixSchema() {
    console.log('🔧 UPDATING SCHEMA FOR OPTIONAL SERVICES...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 60000,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
    });

    try {
        const columns = ['is_ac', 'is_fan', 'is_photography'];

        for (const col of columns) {
            try {
                console.log(`Adding ${col} to bookings...`);
                await pool.query(`ALTER TABLE bookings ADD COLUMN ${col} BOOLEAN DEFAULT FALSE`);
                console.log(`✅ ${col} added.`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`⚠️  ${col} already exists.`);
                } else {
                    console.error(`❌ Failed to add ${col}:`, e.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        await pool.end();
    }
}

fixSchema();
