
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function addPhotographyUser() {
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
        const email = 'photography@hindusthan.net';
        const password = 'hicas';
        const hashedPassword = await bcrypt.hash(password, 10);
        const role = 'photography_team';
        const fullName = 'Photography Team';

        // Check if exists
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('User already exists, updating role/password...');
            await pool.query('UPDATE users SET role = ?, password_hash = ?, full_name = ? WHERE email = ?', [role, hashedPassword, fullName, email]);
        } else {
            console.log('Creating new user...');
            const id = uuidv4();
            await pool.query(
                'INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                [id, email, hashedPassword, fullName, role]
            );
        }

        console.log('✅ Photography Team user ready.');
        console.log('Email:', email);
        console.log('Password:', password);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

addPhotographyUser();
