import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export async function seed() {
    console.log('🌱 Starting Database Seed...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hall_booking_system'
    });

    try {
        const password = 'demo123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Ensure "Administrative Office" exists
        await pool.query(`
            INSERT IGNORE INTO departments (id, name, short_name) 
            VALUES ('${uuidv4()}', 'Administrative Office', 'ADMIN')
        `);
        // Note: UUID is generated. If we need a specific ID, we'd query it. 
        // But since we query by short_name below, this is fine.
        // Wait, INSERT IGNORE won't update/insert if short_name unique? 
        // schema.sql: "short_name" is NOT UNIQUE in schema! 
        // It's just VARCHAR(50) NOT NULL. 
        // But "departments" is seeded in schema.sql.
        // Let's check schema.sql again.

        // Actually best to check if exists first.
        const [adminDept] = await pool.query('SELECT id FROM departments WHERE short_name = "ADMIN"');
        if (adminDept.length === 0) {
            await pool.query('INSERT INTO departments (id, name, short_name) VALUES (?, ?, ?)', [uuidv4(), 'Administrative Office', 'ADMIN']);
        }


        const usersToCreate = [
            {
                email: 'admin@college.edu',
                full_name: 'System Administrator',
                role: 'super_admin',
                dept_short: 'ADMIN'
            },
            {
                email: 'principal@college.edu',
                full_name: 'Dr. Principal',
                role: 'principal',
                dept_short: 'ADMIN' // Principal also books as Admin/Management
            },
            {
                email: 'it.user@college.edu',
                full_name: 'IT Department User',
                role: 'department_user',
                dept_short: 'IT'
            },
            {
                email: 'cse.user@college.edu',
                full_name: 'CSE Department User',
                role: 'department_user',
                dept_short: 'CSE'
            }
        ];

        for (const user of usersToCreate) {
            // Find Department ID if needed
            let deptId = null;
            if (user.dept_short) {
                const [d] = await pool.query('SELECT id FROM departments WHERE short_name = ?', [user.dept_short]);
                if (d.length > 0) {
                    deptId = d[0].id;
                } else {
                    console.warn(`⚠️ Department ${user.dept_short} not found. Skipping department link.`);
                }
            }

            // Check if user exists
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [user.email]);

            if (existing.length === 0) {
                const id = uuidv4();
                await pool.query(
                    'INSERT INTO users (id, email, password_hash, full_name, role, department_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, user.email, hashedPassword, user.full_name, user.role, deptId]
                );
                console.log(`✅ Created: ${user.email}`);
            } else {
                // Check if role/name needs update (optional, but good for "resetting" demo state)
                await pool.query(
                    'UPDATE users SET password_hash=?, full_name=?, role=?, department_id=? WHERE email=?',
                    [hashedPassword, user.full_name, user.role, deptId, user.email]
                );
            }
        }

        await pool.end();
        console.log('✨ Seeding completed.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}
