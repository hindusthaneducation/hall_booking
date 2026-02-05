import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUsers() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
            ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
            : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
    });

    try {
        const emails = [
            'press@hindusthan.net',
            'designing@hindusthan.net',
            'photography@hindusthan.net'
        ];

        console.log('Checking for users...');
        for (const email of emails) {
            const [rows] = await pool.query('SELECT email, role FROM users WHERE email = ?', [email]);
            if (rows.length > 0) {
                console.log(`✅ User found: ${email} (Role: ${rows[0].role})`);
            } else {
                console.log(`❌ User NOT found: ${email}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkUsers();
