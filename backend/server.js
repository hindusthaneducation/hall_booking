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
import { sendEmail, getBookingTemplate, verifyConnection } from './mailer.js';
import cron from 'node-cron';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const frontendUrl = process.env.FRONTEND_URL;
const allowedOrigins = [
    frontendUrl,
    frontendUrl.replace(/\/$/, ''),
    'https://hallbooking.hindusthan.net',
    'http://hallbooking.hindusthan.net'
];
app.use(cors({
    origin: allowedOrigins,
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
app.use('/api/uploads', express.static(uploadDir));

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
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // Default 5MB

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }
});

// Auto-Deletion of Guest Images (Daily at Midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily image cleanup...');
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'hall_booking_system',
            port: process.env.DB_PORT || 3306,
            ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined)
        });

        // Find bookings where event has passed (yesterday or earlier) and has guest photo
        const [rows] = await pool.query(`
            SELECT id, chief_guest_photo_url 
            FROM bookings 
            WHERE booking_date < CURDATE() 
            AND chief_guest_photo_url IS NOT NULL
        `);

        if (rows.length > 0) {
            console.log(`🗑️ Found ${rows.length} expired guest images to delete.`);
            for (const row of rows) {
                if (row.chief_guest_photo_url) {
                    // Extract filename from URL (assuming /uploads/filename.ext or similar)
                    const filename = path.basename(row.chief_guest_photo_url);
                    const filePath = path.join(uploadDir, filename);

                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted file: ${filePath}`);
                    }

                    // Update DB to nullify or set dummy? User said "add dummy images or notginh". 
                    // "only delet and add dummy images or notginh" -> assume remove link or set to dummy.
                    // Setting to NULL is safest/cleanest.
                    await pool.query('UPDATE bookings SET chief_guest_photo_url = NULL WHERE id = ?', [row.id]);
                }
            }
        }
        await pool.end();
    } catch (err) {
        console.error('❌ Image cleanup error:', err);
    }
});


const pool = mysql.createPool({
    host: process.env.DB_HOST,
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
        : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined)
});

// Test Database Connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        console.log(`📊 Connected to database: ${process.env.DB_NAME}`);
        connection.release();

        // Verify Email Connection asynchronously
        verifyConnection();
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
    // Return relative path. Frontend should prepend API_BASE_URL.
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Middleware to handle Multer Limit Errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        // Unknown error
        return res.status(500).json({ error: err.message });
    }
    next();
});

// Emergency DB Fix Endpoint
app.get('/api/admin/fix-schema', async (req, res) => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'hall_booking_system',
            port: process.env.DB_PORT || 3306,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        });

        console.log('🔧 Manual schema fix triggered...');
        let status = [];

        try {
            await pool.query('ALTER TABLE bookings ADD COLUMN start_time TIME');
            status.push('start_time added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) status.push('start_time exists');
            else throw e;
        }

        try {
            await pool.query('ALTER TABLE bookings ADD COLUMN end_time TIME');
            status.push('end_time added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) status.push('end_time exists');
            else throw e;
        }

        await pool.end();

        res.json({ message: `Schema checked/fixed. Status: ${status.join(', ')}` });
    } catch (error) {
        res.status(500).json({ error: error.message, details: 'Manually fixing schema failed' });
    }
});

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
    const { email, password, full_name, role, department_id, institution_id } = req.body;
    try {
        // Enforce Registration Control (unless it's an authenticated Admin/Principal creating a user)
        let isAdminOverride = false;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && (decoded.role === 'super_admin' || decoded.role === 'principal')) {
                    isAdminOverride = true;
                }
            } catch (e) { /* ignore invalid token, treat as public */ }
        }

        if (!isAdminOverride) {
            try {
                const [settings] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = "registration_active"');
                if (settings.length > 0) {
                    const isActive = settings[0].setting_value;
                    const val = typeof isActive === 'object' && isActive !== null && 'value' in isActive ? isActive.value : isActive;

                    if (val === false || val === 'false') {
                        return res.status(403).json({ error: 'Registration is currently closed by the administrator.' });
                    }
                }
            } catch (settingsError) {
                console.warn('⚠️ Could not check registration status (assuming open):', settingsError.message);
            }
        }

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
        const [users] = await pool.query(`
            SELECT u.*, i.name as institution_name, i.short_name as institution_short_name, i.logo_url as institution_logo_url, d.name as department_name, d.short_name as department_short_name
            FROM users u
            LEFT JOIN institutions i ON u.institution_id = i.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = ?
        `, [email]);
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
                    institution_id: user.institution_id,
                    institution: {
                        name: user.institution_name,
                        short_name: user.institution_short_name,
                        logo_url: user.institution_logo_url
                    },
                    department: {
                        name: user.department_name,
                        short_name: user.department_short_name
                    }
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
                   i.name as institution_name, i.short_name as institution_short_name, i.logo_url as institution_logo_url
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
                short_name: user.institution_short_name,
                logo_url: user.institution_logo_url
            } : null
        };

        res.json({ user: profile });


    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Settings Routes ---

app.get('/api/settings/:key', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [req.params.key]);
        if (rows.length === 0) {
            // Return default for registration_active if not set
            if (req.params.key === 'registration_active') {
                return res.json({ value: true });
            }
            return res.status(404).json({ error: 'Setting not found' });
        }

        // Return structured object { value: ... } to match frontend expectation
        // DB stores JSON. If we store `true` (bool), we return { value: true }
        // If we store `{"value": true}`, we return that.
        // Let's coerce to { value: x } format.
        let val = rows[0].setting_value;
        // Parse JSON if it's a string (fixes "false" string being truthy in frontend)
        if (typeof val === 'string') {
            try {
                val = JSON.parse(val);
            } catch (e) {
                // validation failed, treat as raw string
            }
        }
        const responseVal = (typeof val === 'object' && val !== null && 'value' in val) ? val.value : val;

        res.json({ value: responseVal });
    } catch (error) {
        // If table doesn't exist, treat as 404/default
        if (error.code === 'ER_NO_SUCH_TABLE') {
            if (req.params.key === 'registration_active') return res.json({ value: true });
        }
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);

    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    try {
        // Store value as JSON. wrapping in object? 
        // Settings.tsx sends boolean `value`.
        // Let's store just the value or object? 
        // To avoid ambiguity, let's store directly.
        await pool.query(
            'INSERT INTO settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?',
            [key, JSON.stringify(value), req.user.id, JSON.stringify(value), req.user.id]
        );
        res.json({ message: 'Setting updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- User Management Routes ---

app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.department_id, u.institution_id, u.created_at,
                   d.id as dept_id, d.name as dept_name, d.short_name as dept_short_name
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
            institution_id: u.institution_id,
            created_at: u.created_at,
            department: u.dept_id ? { id: u.dept_id, name: u.dept_name, short_name: u.dept_short_name } : null
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
    const { full_name, role, department_id, institution_id, password, email } = req.body;
    try {
        // Validation: Check if email is being changed and if it's unique
        if (email) {
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
            if (existing.length > 0) {
                return res.status(409).json({ error: 'Email already in use by another user' });
            }
        }

        let query = 'UPDATE users SET full_name = ?, role = ?, department_id = ?, institution_id = ?';
        const params = [full_name, role, department_id || null, institution_id || null];

        if (email) {
            query += ', email = ?';
            params.push(email);
        }

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
        // Prevent deleting self
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // CASCADE DELETE: Delete all associated bookings first
        await pool.query('DELETE FROM bookings WHERE user_id = ?', [req.params.id]);

        // Then delete the user
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

        res.json({ message: 'User and associated data deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/halls/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        // Check for dependencies (Bookings)
        const [bookings] = await pool.query('SELECT id FROM bookings WHERE hall_id = ? LIMIT 1', [req.params.id]);
        if (bookings.length > 0) {
            return res.status(409).json({ error: 'Cannot delete hall: Hall has associated bookings.' });
        }

        await pool.query('DELETE FROM halls WHERE id = ?', [req.params.id]);
        res.json({ message: 'Hall deleted successfully' });
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
                   b.is_ac, b.is_fan, b.is_photography,
                   b.media_coordinator_name, b.contact_no,
                   b.chief_guest_name, b.chief_guest_designation, b.chief_guest_organization, b.chief_guest_photo_url,
                   b.event_partner_organization, b.event_partner_details, b.event_partner_logo_url,
                   b.event_coordinator_name, b.event_convenor_details, b.in_house_guest,
                   b.work_status, b.final_file_url, b.photography_drive_link,
                   b.files_urls,
                   b.approved_by, b.approved_at, b.created_at, b.updated_at,
                   h.name as hall_name, d.short_name as department_name, u.full_name as user_name, u.role as user_role,
                   i.short_name as institution_short_name, i.name as institution_name, d.institution_id
            FROM bookings b 
            JOIN halls h ON b.hall_id = h.id 
            JOIN departments d ON b.department_id = d.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN institutions i ON d.institution_id = i.id

        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'super_admin') {
            // Super Admin sees all
        } else if (req.user.role === 'principal') {
            // Principal sees all bookings for their institution
            query += ' WHERE d.institution_id = ?';
            params.push(req.user.institution_id);
        } else if (req.user.role === 'designing_team' || req.user.role === 'photography_team') {
            // Designing & Photography Teams see ALL APPROVED bookings from ALL institutions
            query += ' WHERE b.status = "approved"';
        } else {
            // Department User
            // Logic:
            // 1. If checking a specific Hall (hall_id) -> View ALL bookings for that hall (Public Calendar behavior)
            // 2. If checking My Bookings (no filters) -> View ONLY my bookings

            if (req.query.hall_id || req.query.date) {
                // Public Calendar View: See usage for specific resource
                // Do NOT restrict by user_id here.
            } else {
                // Private View: See my own history
                query += ' WHERE b.user_id = ?';
                params.push(req.user.id);
            }
        }

        // Additional Filters (Availability Check)
        if (req.query.hall_id) {
            // Use AND or WHERE depending on if WHERE clause started
            query += params.length > 0 ? ' AND b.hall_id = ?' : ' WHERE b.hall_id = ?';
            params.push(req.query.hall_id);
        }
        if (req.query.date) {
            query += params.length > 0 ? ' AND b.booking_date = ?' : ' WHERE b.booking_date = ?';
            params.push(req.query.date);
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

    const {
        hall_id, booking_date, event_title, event_description, event_time, start_time, end_time,
        is_ac, is_fan, is_photography,
        media_coordinator_name, contact_no,
        chief_guest_name, chief_guest_designation, chief_guest_organization, chief_guest_photo_url,
        event_partner_organization, event_partner_details, event_partner_logo_url,
        event_coordinator_name, event_convenor_details, in_house_guest,
        files_urls
    } = req.body;
    const id = uuidv4();

    // Input validation for times
    if (!start_time || !end_time) {
        return res.status(400).json({ error: 'Start time and End time are required.' });
    }
    if (start_time >= end_time) {
        return res.status(400).json({ error: 'Start time must be before End time.' });
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
            `INSERT INTO bookings (
                id, hall_id, department_id, user_id, booking_date, 
                event_title, event_description, event_time, start_time, end_time, 
                status, is_ac, is_fan, is_photography,
                media_coordinator_name, contact_no,
                chief_guest_name, chief_guest_designation, chief_guest_organization, chief_guest_photo_url,
                event_partner_organization, event_partner_details, event_partner_logo_url,
                event_coordinator_name, event_convenor_details, in_house_guest,
                files_urls
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, hall_id, departmentId, req.user.id, booking_date,
                event_title, event_description, event_time, start_time, end_time,
                initialStatus, is_ac || false, is_fan || false, is_photography || false,
                media_coordinator_name || null, contact_no || null,
                chief_guest_name || null, chief_guest_designation || null, chief_guest_organization || null, chief_guest_photo_url || null,
                event_partner_organization || null, event_partner_details || null, event_partner_logo_url || null,
                event_coordinator_name || null, event_convenor_details || null, in_house_guest || null,
                files_urls ? JSON.stringify(files_urls) : null
            ]
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

        // Fetch fresh email and name from DB to ensure we have it
        try {
            const [uRows] = await pool.query('SELECT email, full_name FROM users WHERE id = ?', [req.user.id]);
            if (uRows.length > 0 && uRows[0].email) {
                // Update email data with fetched name
                emailData.user_name = uRows[0].full_name;
                // Re-render template with correct name
                const finalHtml = getBookingTemplate(initialStatus, emailData);

                sendEmail(uRows[0].email, `Booking Receipt: ${event_title}`, finalHtml).catch(err => console.error('Email send failed:', err));
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

app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
    const { status, remarks, photography_drive_link } = req.body;
    const { id } = req.params;

    try {
        // Photography Team: Update Link
        if (req.user.role === 'photography_team') {
            if (photography_drive_link !== undefined) {
                await pool.query('UPDATE bookings SET photography_drive_link = ? WHERE id = ?', [photography_drive_link, id]);
                return res.json({ message: 'Drive link updated' });
            }
            return res.status(403).json({ error: 'Photography team can only update drive link' });
        }

        // Admin/Principal: Update Status/Remarks/Link
        if (['principal', 'super_admin'].includes(req.user.role)) {
            const updates = [];
            const values = [];

            if (status) {
                updates.push('status = ?');
                values.push(status);
            }
            if (remarks !== undefined) {
                updates.push('remarks = ?');
                values.push(remarks);
            }
            if (photography_drive_link !== undefined) {
                updates.push('photography_drive_link = ?');
                values.push(photography_drive_link);
            }

            if (updates.length > 0) {
                values.push(id);
                await pool.query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, values);
            }
            return res.json({ message: 'Booking updated' });
        }

        res.sendStatus(403);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BUG FIX: Designing Team Upload Final Design
app.post('/api/bookings/:id/final-design', authenticateToken, upload.single('file'), async (req, res) => {
    // Only Designing Team can upload
    if (req.user.role !== 'designing_team') return res.sendStatus(403);

    // Check if file exists
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const final_file_url = `/uploads/${req.file.filename}`;

    try {
        await pool.query(
            'UPDATE bookings SET final_file_url = ?, work_status = "completed" WHERE id = ?',
            [final_file_url, req.params.id]
        );
        res.json({ message: 'Final design uploaded and work marked as completed', final_file_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Dashboard Stats ---

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const { role, institution_id } = req.user;
        const stats = {
            colleges: 0,
            halls: 0,
            hods: 0,
            principals: 0
        };

        // 1. Colleges Count
        if (role === 'super_admin') {
            const [cRows] = await pool.query('SELECT COUNT(*) as count FROM institutions');
            stats.colleges = cRows[0].count;
        } else {
            // Determines if their institution exists/is valid
            stats.colleges = institution_id ? 1 : 0;
        }

        // 2. Halls Count
        let hallsQuery = 'SELECT COUNT(*) as count FROM halls WHERE is_active = true';
        const hallsParams = [];
        if (role !== 'super_admin' && institution_id) {
            hallsQuery += ' AND institution_id = ?';
            hallsParams.push(institution_id);
        }
        const [hRows] = await pool.query(hallsQuery, hallsParams);
        stats.halls = hRows[0].count;

        // 3. Staff Counts
        let usersQuery = 'SELECT role, COUNT(*) as count FROM users';
        let usersParams = [];

        if (role !== 'super_admin' && institution_id) {
            usersQuery += ' WHERE institution_id = ?';
            usersParams.push(institution_id);
        }
        usersQuery += ' GROUP BY role';

        const [uRows] = await pool.query(usersQuery, usersParams);
        uRows.forEach(row => {
            if (row.role === 'department_user') stats.hods = row.count;
            if (row.role === 'principal') stats.principals = row.count;
        });

        // 4. Recent Bookings (Top 5)
        // Re-using the secure querying logic similar to /api/bookings
        let bookingsQuery = `
            SELECT b.id, b.hall_id, b.event_title, b.booking_date, b.status, h.name as hall_name, i.name as institution_name
            FROM bookings b
            JOIN halls h ON b.hall_id = h.id
            JOIN institutions i ON h.institution_id = i.id
        `;
        const bookingsParams = [];

        if (role !== 'super_admin') {
            // Show bookings for their institution
            if (institution_id) {
                bookingsQuery += ' WHERE h.institution_id = ?';
                bookingsParams.push(institution_id);
            } else {
                // Fallback for user without institution (shouldn't happen for these roles but safe)
                bookingsQuery += ' WHERE 1=0';
            }
        }
        bookingsQuery += ' ORDER BY b.booking_date DESC LIMIT 10';
        const [recentBookings] = await pool.query(bookingsQuery, bookingsParams);

        res.json({ stats, recentBookings });
    } catch (error) {
        console.error('General Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/stats/institutions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);

    try {
        const query = `
            SELECT 
                i.id, i.name, i.short_name,
                COUNT(DISTINCT h.id) as total_halls,
                COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) as pending_bookings,
                COUNT(DISTINCT CASE WHEN b.status = 'approved' AND b.booking_date >= CURDATE() THEN b.id END) as active_bookings
            FROM institutions i
            LEFT JOIN halls h ON i.id = h.institution_id AND h.is_active = true
            LEFT JOIN departments d ON i.id = d.institution_id
            LEFT JOIN bookings b ON (b.hall_id = h.id OR b.department_id = d.id) 
            GROUP BY i.id
            ORDER BY i.name
        `;
        // Note: Joining bookings via Hall OR Department to catch all relevant activity. 
        // Simpler approach: Join bookings via Hall, as bookings are primarily on Halls.
        // Let's refine the query to be Hall-centric for bookings count.

        const refinedQuery = `
            SELECT 
                i.id, i.name, i.short_name,
                (SELECT COUNT(*) FROM halls h WHERE h.institution_id = i.id AND h.is_active = true) as total_halls,
                (SELECT COUNT(*) FROM bookings b 
                 JOIN halls h ON b.hall_id = h.id 
                 WHERE h.institution_id = i.id AND b.status = 'pending') as pending_bookings,
                (SELECT COUNT(*) FROM bookings b 
                 JOIN halls h ON b.hall_id = h.id 
                 WHERE h.institution_id = i.id AND b.status = 'approved' AND b.booking_date >= CURDATE()) as active_bookings
            FROM institutions i
            ORDER BY i.name
        `;

        const [rows] = await pool.query(refinedQuery);
        res.json(rows);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
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

app.get('/api/departments', async (req, res) => {
    try {
        let query = 'SELECT * FROM departments';
        const params = [];

        // If authenticated, we might filter by institution (optional)
        // But for Registration (unauthenticated), we need to show list.
        // We'll check for auth header manually if we want to support both, 
        // OR just make it public and filter if query params exist.

        // Let's support optional auth for filtering? 
        // Or simpler: Just return all departments for now as the registration form requires it.
        // If we want to strictly filter for logged in users, we can check header manually.

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let user = null;

        if (token) {
            try {
                user = jwt.verify(token, JWT_SECRET);
            } catch (e) { /* ignore invalid token for public access */ }
        }

        if (user) {
            if (user.role === 'super_admin') {
                if (req.query.institution_id) {
                    query += ' WHERE institution_id = ?';
                    params.push(req.query.institution_id);
                }
            } else {
                if (user.institution_id) {
                    query += ' WHERE institution_id = ?';
                    params.push(user.institution_id);
                }
            }
        } else {
            // Public / Guest:
            // If query param provided, filter by it (useful for future multi-tenant registration)
            if (req.query.institution_id) {
                query += ' WHERE institution_id = ?';
                params.push(req.query.institution_id);
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

// --- Press Release System ---

// 1. Get Eligible Events for Press Release (Approved, Started, Not yet submitted)
app.get('/api/bookings/pending-press-release', authenticateToken, async (req, res) => {
    if (req.user.role !== 'department_user') return res.sendStatus(403);

    try {
        // Fetch approved bookings for this user that have STARTED and don't have a press release
        const [rows] = await pool.query(`
            SELECT b.id, b.event_title, b.booking_date, b.event_time, b.start_time, b.event_coordinator_name
            FROM bookings b
            LEFT JOIN press_releases pr ON b.id = pr.booking_id
            WHERE b.user_id = ? 
            AND b.status = 'approved'
            AND pr.id IS NULL
            AND (
                b.booking_date <= CURDATE() 
                OR b.work_status = 'completed'
            )
            ORDER BY b.booking_date DESC
        `, [req.user.id]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Overdue Alerts (Ended > 3 hours ago & No Press Release)
app.get('/api/notifications/press-release-overdue', authenticateToken, async (req, res) => {
    if (req.user.role !== 'department_user') return res.sendStatus(403);

    try {
        // Logic: Event ended 3 hours ago usually implies End Time + 3h < Now
        // Simple heuristic: If booking_date < today -> Overdue.
        // If booking_date == today, check end_time + 3h.

        const [rows] = await pool.query(`
            SELECT b.id, b.event_title, b.booking_date
            FROM bookings b
            LEFT JOIN press_releases pr ON b.id = pr.booking_id
            WHERE b.user_id = ? 
            AND b.status = 'approved'
            AND pr.id IS NULL
            AND (
                b.booking_date < CURDATE() 
                OR (
                    b.booking_date = CURDATE() 
                    AND ADDTIME(b.end_time, '03:00:00') <= CURTIME()
                )
            )
        `, [req.user.id]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/press-releases', authenticateToken, upload.fields([
    { name: 'english_writeup', maxCount: 1 },
    { name: 'tamil_writeup', maxCount: 1 },
    { name: 'photo_description', maxCount: 1 },
    { name: 'photos', maxCount: 10 }
]), async (req, res) => {
    // Only Department Users (and maybe admin?) can submit
    if (req.user.role !== 'department_user' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { booking_id, coordinator_name, event_title, event_date } = req.body;

        if (!booking_id || !coordinator_name || !event_title || !event_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Helper to get file path if exists
        const getFile = (fieldName) => {
            if (req.files[fieldName] && req.files[fieldName][0]) {
                return `/uploads/${req.files[fieldName][0].filename}`;
            }
            return null;
        };

        const english_writeup = getFile('english_writeup');
        const tamil_writeup = getFile('tamil_writeup');
        const photo_description = getFile('photo_description');

        // Photos array
        let photos = [];
        if (req.files['photos']) {
            photos = req.files['photos'].map(f => `/uploads/${f.filename}`);
        }

        const id = uuidv4();

        await pool.query(
            `INSERT INTO press_releases 
            (id, user_id, department_id, booking_id, coordinator_name, event_title, event_date, english_writeup, tamil_writeup, photo_description, photos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                req.user.id,
                req.user.department_id || null, // Handle possible null
                booking_id,
                coordinator_name,
                event_title,
                event_date,
                english_writeup,
                tamil_writeup,
                photo_description,
                JSON.stringify(photos)
            ]
        );

        res.status(201).json({ message: 'Press Release submitted successfully' });

    } catch (error) {
        console.error('Press Release Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Admin: Get Press Releases
app.get('/api/admin/press-releases', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);

    const { status } = req.query;
    let query = `
        SELECT pr.*, d.name as department_name, i.name as institution_name, i.short_name as institution_short_name, u.email as user_email 
        FROM press_releases pr
        JOIN departments d ON pr.department_id = d.id
        JOIN institutions i ON d.institution_id = i.id
        JOIN users u ON pr.user_id = u.id
    `;
    const params = [];

    if (status) {
        query += ' WHERE pr.status = ?';
        params.push(status);
    }

    query += ' ORDER BY pr.created_at DESC';

    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Admin: Update Press Release Status
app.put('/api/admin/press-releases/:id/status', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);

    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        await pool.query('UPDATE press_releases SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Teams: Get Approved Press Releases (For Press Release Team & Designing Team)
app.get('/api/teams/approved-press-releases', authenticateToken, async (req, res) => {
    // Allowed roles: press_release_team, super_admin
    const allowed = ['press_release_team', 'super_admin'];
    if (!allowed.includes(req.user.role)) return res.sendStatus(403);

    try {
        const [rows] = await pool.query(`
            SELECT pr.*, d.name as department_name, u.email as user_email
            FROM press_releases pr
            JOIN departments d ON pr.department_id = d.id
            JOIN users u ON pr.user_id = u.id
            WHERE pr.status = 'approved'
            ORDER BY pr.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/departments/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    try {
        // Check dependencies
        const [users] = await pool.query('SELECT id FROM users WHERE department_id = ? LIMIT 1', [req.params.id]);
        if (users.length > 0) return res.status(409).json({ error: 'Cannot delete department: Users are assigned to it.' });

        const [bookings] = await pool.query('SELECT id FROM bookings WHERE department_id = ? LIMIT 1', [req.params.id]);
        if (bookings.length > 0) return res.status(409).json({ error: 'Cannot delete department: It has associated bookings.' });

        await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Department deleted' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Cannot delete department due to associated records.' });
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/institutions', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM institutions';
        const params = [];

        // Security: Restrict visibility for non-super-admins
        if (req.user.role !== 'super_admin') {
            query += ' WHERE id = ?';
            // Ensure institution_id is present to avoid showing nothing or error
            if (!req.user.institution_id) {
                return res.json([]); // Or return 403, but empty list is safer for UI
            }
            params.push(req.user.institution_id);
        }

        query += ' ORDER BY name';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/institutions', authenticateToken, upload.single('logo'), async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { name, short_name } = req.body;
    const id = uuidv4();
    const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        await pool.query(
            'INSERT INTO institutions (id, name, short_name, logo_url) VALUES (?, ?, ?, ?)',
            [id, name, short_name || null, logo_url]
        );
        res.status(201).json({ message: 'Institution created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/institutions/:id', authenticateToken, upload.single('logo'), async (req, res) => {
    if (req.user.role !== 'super_admin') return res.sendStatus(403);
    const { name, short_name } = req.body;
    const logo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
        let query = 'UPDATE institutions SET name=?, short_name=?';
        const params = [name, short_name || null];

        if (logo_url) {
            query += ', logo_url=?';
            params.push(logo_url);
        }

        query += ' WHERE id=?';
        params.push(req.params.id);

        await pool.query(query, params);
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

const PORT = process.env.PORT || 5001;

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
