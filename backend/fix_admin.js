import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixAdmin() {
    console.log('Fixing Super Admin Institution...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
    });

    try {
        // 1. Get the admin user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@college.edu']);

        if (!users || users.length === 0) {
            console.log('Admin user not found.');
            process.exit(1);
        }

        const admin = users[0];
        console.log('Current Admin State:', admin);

        if (admin.institution_id) {
            // 2. Update to NULL
            await pool.query('UPDATE users SET institution_id = NULL WHERE id = ?', [admin.id]);
            console.log('Successfully set admin institution_id to NULL.');
        } else {
            console.log('Admin already has NULL institution_id.');
        }

    } catch (error) {
        console.error('Error fixing admin:', error);
    } finally {
        await pool.end();
    }
}

fixAdmin();
