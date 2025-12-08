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
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
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
    const { email, password, full_name, role, department_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();

        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'User already exists' });

        await pool.query(
            'INSERT INTO users (id, email, password_hash, full_name, role, department_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, email, hashedPassword, full_name, role, department_id || null]
        );

        res.status(201).json({ message: 'User created successfully', user: { id, email, full_name, role, department_id } });
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
            const token = jwt.sign({ id: user.id, role: user.role, department_id: user.department_id }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, department_id: user.department_id } });
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
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, d.name as department_name, d.short_name as department_short_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
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
            department: user.department_id ? {
                id: user.department_id,
                name: user.department_name,
                short_name: user.department_short_name
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
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, u.created_at,
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
            department_id: u.department_id,
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
    const { full_name, role, department_id, password } = req.body; // Added password
    try {
        let query = 'UPDATE users SET full_name = ?, role = ?, department_id = ?';
        const params = [full_name, role, department_id || null];

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
        // Show all halls to admin, only active ones to others
        const query = req.user.role === 'super_admin'
            ? 'SELECT * FROM halls ORDER BY name'
            : 'SELECT * FROM halls WHERE is_active = true ORDER BY name';

        const [rows] = await pool.query(query);
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

    const { name, description, image_url, stage_size, seating_capacity, hall_type, is_active } = req.body;
    const id = uuidv4();

    try {
        await pool.query(
            'INSERT INTO halls (id, name, description, image_url, stage_size, seating_capacity, hall_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, description, image_url, stage_size, seating_capacity, hall_type, is_active ?? true]
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
                   b.approved_by, b.approved_at, b.created_at, b.updated_at,
                   h.name as hall_name, d.short_name as department_name, u.full_name as user_name
            FROM bookings b 
            JOIN halls h ON b.hall_id = h.id 
            JOIN departments d ON b.department_id = d.id
            JOIN users u ON b.user_id = u.id
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

    const { hall_id, booking_date, event_title, event_description, event_time } = req.body;
    const id = uuidv4();

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
            'INSERT INTO bookings (id, hall_id, department_id, user_id, booking_date, event_title, event_description, event_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, hall_id, departmentId, req.user.id, booking_date, event_title, event_description, event_time, initialStatus]
        );
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

    const { event_title, event_description, event_time, booking_date } = req.body;
    try {
        await pool.query(
            'UPDATE bookings SET event_title=?, event_description=?, event_time=?, booking_date=? WHERE id=?',
            [event_title, event_description, event_time, booking_date, req.params.id]
        );
        res.json({ message: 'Booking updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BUG FIX: Delete Event (Admin/Principal only)
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
    if (!['super_admin', 'principal'].includes(req.user.role)) return res.sendStatus(403);

    try {
        await pool.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Department Routes ---

app.get('/api/departments', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM departments ORDER BY name');
        res.json(rows);
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
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🔗 Frontend allowed: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server due to database init error:', error);
        process.exit(1);
    }
};

startServer();
