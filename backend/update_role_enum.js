
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function updateRoleEnum() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
            ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
            : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
    });

    try {
        console.log('🔄 updating role enum...');
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('department_user', 'principal', 'super_admin', 'designing_team') NOT NULL");
        console.log('✅ Role enum updated.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

updateRoleEnum();
