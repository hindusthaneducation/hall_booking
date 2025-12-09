import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB } from './init_db.js';
import { seed } from './seed.js';
import { sendEmail, getBookingTemplate } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Static Uploads Directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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
    connectTimeout: 60000, // Wait 60s before timeout
    ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
        ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
        : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
});

// Test Database Connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        console.log(`📊 Connected to database: ${process.env.DB_NAME}`);
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
        req.user = user;
        next();
    });
};

// Upload Endpoint
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return full URL
    const fileUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}`.replace('5173', process.env.PORT || '3000') + `/uploads/${req.file.filename}`;
    // Or just relative path if you prefer, but full URL is easier if strict separation
    // Better: Use req.protocol + '://' + req.get('host') + '/uploads/' + req.file.filename
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${baseUrl}/uploads/${req.file.filename}` });
});

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
    const { email, password, full_name, role, department_id, institution_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'User already exists' });

        await pool.query(
            'INSERT INTO users (id, email, password_hash, full_name, role, department_id, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, email, hashedPassword, full_name, role, department_id || null, institution_id || null]
        );

        res.status(201).json({ message: 'User created successfully', user: { id, email, full_name, role, department_id, institution_id } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = users[0];
        if (await bcrypt.compare(password, user.password_hash)) {
            const token = jwt.sign({
                id: user.id,
                role: user.role,
                department_id: user.department_id,
                institution_id: user.institution_id
            }, JWT_SECRET, { expiresIn: '24h' });

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    department_id: user.department_id,
                    institution_id: user.institution_id
                }
            });
        } else {
            res.status(403).json({ error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, u.institution_id, 
                   d.name as department_name, d.short_name as department_short_name,
                   i.name as institution_name, i.short_name as institution_short_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN institutions i ON u.institution_id = i.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (users.length === 0) return res.sendStatus(404);
        const user = users[0];

        // Structure to match frontend expectations for 'profile'
        const profile = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            department_id: user.department_id,
            institution_id: user.institution_id, // Added
            department: user.department_id ? {
                id: user.department_id,
                name: user.department_name,
                short_name: user.department_short_name
            } : null,
            institution: user.institution_id ? {
                id: user.institution_id,
                name: user.institution_name,
                short_name: user.institution_short_name
            } : null
        };

        res.json({ user: profile });


    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- User Management Routes ---

app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, u.institution_id, u.created_at,
                   d.id as dept_id, d.name as dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY u.created_at DESC
        `);

        // Format for frontend
        const formattedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            role: u.role,
            department_id: u.department_id,
            institution_id: u.institution_id, // Added
            created_at: u.created_at,
            department: u.dept_id ? { id: u.dept_id, name: u.dept_name } : null
        }));

        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { old_password, new_password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.sendStatus(404);

        const user = users[0];
        const validPassword = await bcrypt.compare(old_password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Incorrect old password' });

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { full_name, role, department_id, institution_id, password } = req.body;
    try {
        let query = 'UPDATE users SET full_name = ?, role = ?, department_id = ?, institution_id = ?';
        const params = [full_name, role, department_id || null, institution_id || null];

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password_hash = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        await pool.query(query, params);
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        // Prevent deleting self? Optional but good practice.
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Hall Management Routes ---

app.get('/api/halls', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT h.*, i.name as institution_name, i.short_name as institution_short_name 
            FROM halls h
            LEFT JOIN institutions i ON h.institution_id = i.id
        `;
        const params = [];

        // Super Admin sees all (or can filter via query param if we added that)
        if (req.user.role === 'super_admin') {
            query += ' ORDER BY h.name';
        } else {
            // Others see only their institution's active halls
            query += ' WHERE h.is_active = true AND h.institution_id = ? ORDER BY h.name';
            params.push(req.user.institution_id);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/halls/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM halls WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.sendStatus(404);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/halls', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);

    const { name, description, image_url, stage_size, seating_capacity, hall_type, is_active, institution_id } = req.body;
    const id = uuidv4();

    try {
        await pool.query(
            'INSERT INTO halls (id, name, description, image_url, stage_size, seating_capacity, hall_type, is_active, institution_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, description, image_url, stage_size, seating_capacity, hall_type, is_active ?? true, institution_id]
        );
        res.status(201).json({ message: 'Hall created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/halls/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);

    const { name, description, image_url, stage_size, seating_capacity, hall_type, is_active } = req.body;
    try {
        await pool.query(
            'UPDATE halls SET name=?, description=?, image_url=?, stage_size=?, seating_capacity=?, hall_type=?, is_active=? WHERE id=?',
            [name, description, image_url, stage_size, seating_capacity, hall_type, is_active, req.params.id]
        );
        res.json({ message: 'Hall updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Booking Routes ---

app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT b.id, b.hall_id, b.department_id, b.user_id, DATE_FORMAT(b.booking_date, '%Y-%m-%d') as booking_date, 
                   b.event_title, b.event_description, b.event_time, b.status, b.rejection_reason,
                   b.start_time, b.end_time, 
                   b.approved_by, b.approved_at, b.created_at, b.updated_at,
                   h.name as hall_name, d.short_name as department_name, u.full_name as user_name,
                   i.short_name as institution_short_name, i.name as institution_name, d.institution_id
            FROM bookings b 
            JOIN halls h ON b.hall_id = h.id 
            JOIN departments d ON b.department_id = d.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN institutions i ON d.institution_id = i.id
        `;
        const params = [];
        const showAll = req.query.view === 'all' || ['super_admin', 'principal'].includes(req.user.role);

        if (!showAll && req.user.role === 'department_user') {
            query += ' WHERE b.user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY b.booking_date DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
    // BUG FIX: Allow admins/principals to book (block) halls
    const allowedRoles = ['department_user', 'super_admin', 'principal'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to book halls' });
    }

    const { hall_id, booking_date, event_title, event_description, event_time, start_time, end_time } = req.body;
    const id = uuidv4();

    // Input validation for times
    if (!start_time || !end_time) {
        return res.status(400).json({ error: 'Start time and End time are required.' });
    }

    // Check for Overlapping Bookings
    // Overlap condition: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
    // We must ignore rejected bookings.
    try {
        const [conflicts] = await pool.query(`
    SELECT * FROM bookings 
            WHERE hall_id = ?
        AND booking_date = ?
            AND status != 'rejected'
    AND(
        (start_time IS NULL OR start_time < ?) AND
            (end_time IS NULL OR end_time > ?)
            )
        `, [hall_id, booking_date, end_time, start_time]);

        if (conflicts.length > 0) {
            return res.status(409).json({ error: 'Hall is already booked for this time slot.' });
        }
    } catch (confErr) {
        console.error('Conflict check error:', confErr);
        return res.status(500).json({ error: 'Error checking availability' });
    }

    // If Admin/Principal appoves immediately
    const initialStatus = ['super_admin', 'principal'].includes(req.user.role) ? 'approved' : 'pending';

    // Admin/Principal might have department_id linked now (via seed), or we handle null if they don't.
    // If they don't, we fallback to finding the 'ADMIN' department.
    let departmentId = req.user.department_id;
    if (!departmentId) {
        // Fallback: try to find ADMIN department
        const [d] = await pool.query('SELECT id FROM departments WHERE short_name = "ADMIN" LIMIT 1');
        if (d.length > 0) departmentId = d[0].id;
    }

    // If still no departmentId, we can't insert due to Schema constraint.
    // But since we seeded it, it should be fine. 
    // If really fail, returning error is better than crash.
    if (!departmentId) {
        return res.status(500).json({ error: 'System Error: No "ADMIN" department found for admin booking.' });
    }

    try {
        await pool.query(
            'INSERT INTO bookings (id, hall_id, department_id, user_id, booking_date, event_title, event_description, event_time, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, hall_id, departmentId, req.user.id, booking_date, event_title, event_description, event_time, start_time, end_time, initialStatus]
        );

        // Fetch hall name for email
        const [hRows] = await pool.query('SELECT name FROM halls WHERE id = ?', [hall_id]);
        const hallName = hRows.length > 0 ? hRows[0].name : 'Hall';

        const emailData = {
            user_name: req.user.full_name,
            hall_name: hallName,
            booking_date,
            event_time,
            event_title
        };


        const html = getBookingTemplate(initialStatus, emailData);

        // Fetch fresh email from DB to ensure we have it
        try {
            const [uRows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
            if (uRows.length > 0 && uRows[0].email) {
                sendEmail(uRows[0].email, `Booking Receipt: ${event_title} `, html).catch(err => console.error('Email send failed:', err));
            } else {
                console.warn('⚠️ No email found for user in DB, skipping notification.');
            }
        } catch (e) {
            console.error('Failed to fetch user email:', e);
        }

        res.status(201).json({ message: initialStatus === 'approved' ? 'Hall blocked successfully' : 'Booking requested' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/bookings/:id/status', authenticateToken, async (req, res) => {
    const { status, rejection_reason } = req.body;

    if (req.user.role === 'principal' || req.user.role === 'super_admin') {
        try {
            await pool.query(
                'UPDATE bookings SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
                [status, rejection_reason || null, req.user.id, req.params.id]
            );

            // Fetch details for email
            // Fetch details for email
            const [bRows] = await pool.query(`
                SELECT b.booking_date, b.event_title, b.event_time, b.rejection_reason,
                       u.email, u.full_name as user_name, h.name as hall_name
                FROM bookings b
                JOIN users u ON b.user_id = u.id
                JOIN halls h ON b.hall_id = h.id
                WHERE b.id = ?
            `, [req.params.id]);

            if (bRows.length > 0) {
                const booking = bRows[0];
                const html = getBookingTemplate(status, booking);

                // Dynamic Subject based on Status
                let subject = `Booking Update: ${booking.event_title}`;
                if (status === 'approved') subject = `Booking Approved: ${booking.event_title} 🎉`;
                if (status === 'rejected') subject = `Booking Rejected: ${booking.event_title}`;

                // Don't await email to prevent blocking response
                sendEmail(booking.email, subject, html);
            }

            res.json({ message: 'Booking updated' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.sendStatus(403);
    }
});

// BUG FIX: Edit Event (Admin/Principal only)
app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
    if (!['super_admin', 'principal'].includes(req.user.role)) return res.sendStatus(403);

    const { event_title, event_description, event_time, booking_date, start_time, end_time, reason } = req.body;

    // Validate times if provided? Assuming frontend sends them if it's the new form.

    try {
        await pool.query(
            'UPDATE bookings SET event_title=?, event_description=?, event_time=?, booking_date=?, start_time=?, end_time=? WHERE id=?',
            [event_title, event_description, event_time, booking_date, start_time || null, end_time || null, req.params.id]
        );

        // Fetch details for email
        const [bRows] = await pool.query(`
            SELECT b.booking_date, b.event_title, b.event_time, b.status,
                u.email, u.full_name as user_name, h.name as hall_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN halls h ON b.hall_id = h.id
            WHERE b.id = ?
                `, [req.params.id]);

        if (bRows.length > 0) {
            const booking = bRows[0];
            booking.reason = reason; // Add manual reason
            const html = getBookingTemplate('updated', booking); // Need to handle 'updated' in template or reuse 'approved'
            // 'updated' isn't in template yet. Let's use 'approved' but maybe title changes?
            // User requested: "update any... mail send ok"
            // I'll add 'updated' case to mailer.js separately or just send general update.
            // For now, reuse 'approved' or 'pending' depending on status, but simply "Booking Details Updated".

            sendEmail(booking.email, `Booking Details Updated: ${booking.event_title} `, html).catch(e => console.error(e));
        }

        res.json({ message: 'Booking updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BUG FIX: Delete Event (Admin/Principal only)
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
    if (!['super_admin', 'principal'].includes(req.user.role)) return res.sendStatus(403);

    try {
        // Fetch details BEFORE delete for email
        const [bRows] = await pool.query(`
            SELECT b.event_title, u.email, u.full_name as user_name, h.name as hall_name, b.booking_date, b.event_time
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN halls h ON b.hall_id = h.id
            WHERE b.id = ?
                `, [req.params.id]);

        await pool.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);

        if (bRows.length > 0) {
            const booking = bRows[0];
            // Use 'rejected' template or 'cancelled'
            // We'll pass 'rejected' status to reuse Red color, but reason is "Cancelled by Administrator"
            booking.rejection_reason = req.body.reason ? `Cancelled by Admin: ${req.body.reason}` : "Cancelled by Administrator";
            const html = getBookingTemplate('rejected', booking);
            sendEmail(booking.email, `Booking Cancelled: ${booking.event_title} `, html).catch(e => console.error(e));
        }

        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Department Routes ---

app.get('/api/departments', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM departments';
        const params = [];

        // Filter by institution if user has one (except maybe super_admin wanting to see all? 
        // But usually super admin selects an institution first. 
        // For now, if super_admin provides ?institution_id, use it.
        // If normal user, enforce their institution_id.

        if (req.user.role === 'super_admin') {
            if (req.query.institution_id) {
                query += ' WHERE institution_id = ?';
                params.push(req.query.institution_id);
            }
        } else {
            if (req.user.institution_id) {
                query += ' WHERE institution_id = ?';
                params.push(req.user.institution_id);
            }
        }

        query += ' ORDER BY name';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/departments', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { name, short_name, institution_id } = req.body;
    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO departments (id, name, short_name, institution_id) VALUES (?, ?, ?, ?)',
            [id, name, short_name, institution_id]
        );
        res.status(201).json({ message: 'Department created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/departments/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { name, short_name, institution_id } = req.body;
    try {
        await pool.query(
            'UPDATE departments SET name=?, short_name=?, institution_id=? WHERE id=?',
            [name, short_name, institution_id, req.params.id]
        );
        res.json({ message: 'Department updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/departments/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Department deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/institutions', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM institutions ORDER BY name');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/institutions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { name, short_name } = req.body;
    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO institutions (id, name, short_name) VALUES (?, ?, ?)',
            [id, name, short_name || null]
        );
        res.status(201).json({ message: 'Institution created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/institutions/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { name, short_name } = req.body;
    try {
        await pool.query(
            'UPDATE institutions SET name=?, short_name=? WHERE id=?',
            [name, short_name || null, req.params.id]
        );
        res.json({ message: 'Institution updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/institutions/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        await pool.query('DELETE FROM institutions WHERE id=?', [req.params.id]);
        res.json({ message: 'Institution deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await initDB();
        await seed();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} `);
            console.log(`🔗 Frontend allowed: ${process.env.FRONTEND_URL || 'http://localhost:5173'} `);
        });
    } catch (error) {
        console.error('❌ Failed to start server due to database init error:', error);
        process.exit(1);
    }
};

startServer();
