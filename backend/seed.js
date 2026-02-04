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
        database: process.env.DB_NAME || 'hall_booking_system',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
    });

    try {
        const institutionsData = [
            'Hindusthan College of Arts & Science',
            'Hindusthan College of Engineering & Technology',
            'Hindusthan Institute of Technology',
            'Hindusthan College of Education',
            'Hindusthan School of Architecture',
            'Hindusthan Polytechnic College',
            'Hindusthan School',
            'Hindusthan International School',
            'Hindusthan College of Health Science',
            'Hindusthan College of Nursing',
            'Hindusthan College of Science & Commerce'
        ];

        // 1. Seed Institutions
        const institutionsMap = new Map(); // name -> id
        for (const name of institutionsData) {
            // Check if exists
            const [rows] = await pool.query('SELECT id FROM institutions WHERE name = ?', [name]);
            let id;
            if (rows.length > 0) {
                id = rows[0].id;
            } else {
                id = uuidv4();
                await pool.query('INSERT INTO institutions (id, name) VALUES (?, ?)', [id, name]);
                console.log(`🏫 Created Institution: ${name}`);
            }
            institutionsMap.set(name, id);
        }

        // 2. Default DEPARTMENTS for EACH Institution
        // For simplicity, we'll add 'ADMIN', 'IT', 'CSE' to all for now.
        const defaultDepts = [
            { name: 'Administrative Office', short_name: 'ADMIN' },
            { name: 'Information Technology', short_name: 'IT' },
            { name: 'Computer Science Engineering', short_name: 'CSE' }
        ];

        // We will store Department IDs for the FIRST institution to link demo users
        const demoInstName = 'Hindusthan College of Arts & Science';
        const demoInstId = institutionsMap.get(demoInstName);
        const demoDeptIds = {}; // short_name -> id (for demoInst)

        for (const [instName, instId] of institutionsMap.entries()) {
            for (const dept of defaultDepts) {
                // Check if dept exists for this institution
                const [dRows] = await pool.query(
                    'SELECT id FROM departments WHERE institution_id = ? AND short_name = ?',
                    [instId, dept.short_name]
                );

                let deptId;
                if (dRows.length > 0) {
                    deptId = dRows[0].id;
                } else {
                    deptId = uuidv4();
                    await pool.query(
                        'INSERT INTO departments (id, institution_id, name, short_name) VALUES (?, ?, ?, ?)',
                        [deptId, instId, dept.name, dept.short_name]
                    );
                }

                if (instId === demoInstId) {
                    demoDeptIds[dept.short_name] = deptId;
                }
            }
        }

        const password = 'hicas';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Seed Users (Linked to Demo Institution)
        const usersToCreate = [
            {
                email: 'admin@hindusthan.net',
                full_name: 'System Administrator',
                role: 'super_admin',
                dept_short: 'ADMIN',
                // Super Admin technically might not need an institution if they are global, 
                // but our schema links them. Let's link to Demo Inst for now or NULL if allowed.
                // Schema: institution_id is nullable for users.
                // But for "Bookings", they need a department.
                institution_id: demoInstId
            },
            {
                email: 'principal@hicas.ac.in',
                full_name: 'Dr. Principal',
                role: 'principal',
                dept_short: 'ADMIN',
                institution_id: demoInstId
            },
            {
                email: 'it@hicas.ac.in',
                full_name: 'IT Department User',
                role: 'department_user',
                dept_short: 'IT',
                institution_id: demoInstId
            },
            {
                email: 'cse@hicas.ac.in',
                full_name: 'CSE Department User',
                role: 'department_user',
                dept_short: 'CSE',
                institution_id: demoInstId
            },
            {
                email: 'press@hindusthan.net',
                full_name: 'Press Release Team',
                role: 'press_release_team',
                dept_short: 'ADMIN',
                institution_id: demoInstId
            },
            {
                email: 'designing@hindusthan.net',
                full_name: 'Designing Team',
                role: 'designing_team',
                dept_short: 'ADMIN',
                institution_id: demoInstId
            },
            {
                email: 'photography@hindusthan.net',
                full_name: 'Photography Team',
                role: 'photography_team',
                dept_short: 'ADMIN',
                institution_id: demoInstId
            }
        ];

        for (const user of usersToCreate) {
            const [uRows] = await pool.query('SELECT id FROM users WHERE email = ?', [user.email]);

            let deptId = null;
            if (user.dept_short) {
                // We must fetch the Dept ID specifically for this user's institution
                // But wait, user object has `institution_id` above.
                // And we have `demoDeptIds` only for demoInst.

                if (user.institution_id === demoInstId) {
                    deptId = demoDeptIds[user.dept_short];
                } else {
                    // Fetch dynamically if we add users for other colleges
                    const [d] = await pool.query(
                        'SELECT id FROM departments WHERE institution_id = ? AND short_name = ?',
                        [user.institution_id, user.dept_short]
                    );
                    if (d.length > 0) deptId = d[0].id;
                }
            }

            if (uRows.length === 0) {
                await pool.query(
                    'INSERT INTO users (id, email, password_hash, full_name, role, department_id, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [uuidv4(), user.email, hashedPassword, user.full_name, user.role, deptId, user.institution_id]
                );
                console.log(`✅ Created User: ${user.email}`);
            } else {
                await pool.query(
                    'UPDATE users SET password_hash=?, full_name=?, role=?, department_id=?, institution_id=? WHERE email=?',
                    [hashedPassword, user.full_name, user.role, deptId, user.institution_id, user.email]
                );
            }
        }

        console.log('✨ Seeding completed.');
        await pool.end();
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}
