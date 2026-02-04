import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const createPressUser = async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306
    });

    try {
        const email = 'press@hindusthan.net';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = 'Press Release Team';
        const role = 'press_release_team';

        // Check if user exists
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existing.length > 0) {
            console.log(`⚠️ User ${email} already exists.`);
            // Update role just in case
            await pool.query('UPDATE users SET role = ? WHERE email = ?', [role, email]);
            console.log(`✅ Updated role for ${email} to ${role}`);
        } else {
            const id = uuidv4();
            await pool.query(
                'INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
                [id, email, hashedPassword, fullName, role]
            );
            console.log(`✅ Created user: ${email} / ${password} (Role: ${role})`);
        }

    } catch (error) {
        console.error('❌ Error creating user:', error);
    } finally {
        await pool.end();
    }
};

createPressUser();
