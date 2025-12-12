import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDB() {
    console.log('🔄 Initializing Database...');
    console.log(`📡 Connecting to DB at ${process.env.DB_HOST}:${process.env.DB_PORT}...`);

    try {
        // Debug: Check DNS resolution
        try {
            const dns = await import('dns');
            const { promisify } = await import('util');
            const lookup = promisify(dns.lookup);
            if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
                const { address } = await lookup(process.env.DB_HOST);
                console.log(`🔍 DNS Resolution: ${process.env.DB_HOST} -> ${address}`);
            }
        } catch (dnsErr) {
            console.error(`⚠️ DNS Lookup Failed for ${process.env.DB_HOST}:`, dnsErr.message);
        }

        const dbName = process.env.DB_NAME || 'hall_booking_system';

        // Try connecting directly to the database first (fast path for cloud/shared hosting)
        try {
            const directConnection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: dbName,
                port: process.env.DB_PORT || 3306,
                connectTimeout: 60000,
                ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                    ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                    : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
            });
            await directConnection.end();
            console.log(`✅ Successfully connected to existing database '${dbName}'`);
        } catch (err) {
            // If direct connection fails (e.g. DB doesn't exist), try connecting to server root to create it
            if (err.code === 'BAD_DB_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
                console.log(`database '${dbName}' not found, attempting to create...`);
                const rootConnection = await mysql.createConnection({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    port: process.env.DB_PORT || 3306,
                    connectTimeout: 60000,
                    ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                        ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                        : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
                });
                try {
                    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
                    console.log(`✅ Database '${dbName}' created.`);
                } catch (createErr) {
                    console.warn(`⚠️ Could not create DB (might be restricted cloud user): ${createErr.message}`);
                }
                await rootConnection.end();
            } else {
                console.warn(`⚠️ Warning: Could not connect to DB '${dbName}' directly: ${err.message}`);
            }
        }

        // Connect to DB to run schema
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: process.env.DB_PORT || 3306,
            connectTimeout: 60000,
            ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined),
            multipleStatements: true
        });

        // Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        try {
            await pool.query(schema);
            console.log('✅ Schema Executed Successfully.');
        } catch (schemaErr) {
            console.error('❌ Schema Execution Failed:', schemaErr.message);
            throw schemaErr;
        }

        await pool.end();

        // Separate migration step for existing tables
        const migrationPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: process.env.DB_PORT || 3306,
            ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
        });

        try {
            console.log('⏳ Checking for schema updates (start_time)...');
            try {
                await migrationPool.query('ALTER TABLE bookings ADD COLUMN start_time TIME');
                console.log('✅ start_time column added.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ start_time already exists.');
                } else {
                    throw e;
                }
            }

            console.log('⏳ Checking for schema updates (end_time)...');
            try {
                await migrationPool.query('ALTER TABLE bookings ADD COLUMN end_time TIME');
                console.log('✅ end_time column added.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ end_time already exists.');
                } else {
                    throw e;
                }
            }

        } catch (migErr) {
            console.warn('⚠️ Schema migration warning:', migErr.message);
        }

        try {
            console.log('⏳ Checking for schema updates (short_name in departments)...');
            try {
                await migrationPool.query('ALTER TABLE departments ADD COLUMN short_name VARCHAR(50)');
                console.log('✅ departments.short_name column added.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ departments.short_name already exists.');
                } else {
                    throw e;
                }
            }

            console.log('⏳ Checking for schema updates (short_name in institutions)...');
            try {
                await migrationPool.query('ALTER TABLE institutions ADD COLUMN short_name VARCHAR(50)');
                console.log('✅ institutions.short_name column added.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ institutions.short_name already exists.');
                } else {
                    throw e;
                }
            }



            try {
                console.log('⏳ Checking for settings table...');
                // Create settings table (MySQL Syntax)
                await migrationPool.query(`
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(255) PRIMARY KEY,
                    setting_value JSON NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    updated_by CHAR(36),
                    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
                console.log('✅ settings table checked/created.');

                // Insert default registration_active = true (Active) if not exists
                // We use INSERT IGNORE or checking existence
                const [sRows] = await migrationPool.query('SELECT * FROM settings WHERE setting_key = "registration_active"');
                if (sRows.length === 0) {
                    await migrationPool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['registration_active', JSON.stringify(true)]);
                    console.log('✅ Default registration_active setting inserted.');
                }

                console.log('⏳ Checking for theme_preference in users...');
                await migrationPool.query("ALTER TABLE users ADD COLUMN theme_preference VARCHAR(50) DEFAULT 'hindusthan'");
                console.log('✅ theme_preference column added.');
            } catch (migErr2) {
                // Ignore Duplicate Column errors (ER_DUP_FIELDNAME / 1060)
                if (migErr2.code === 'ER_DUP_FIELDNAME' || migErr2.errno === 1060) {
                    console.log('✅ theme_preference already exists.');
                } else {
                    console.warn('⚠️ Additional migration warning:', migErr2.message);
                }
            }

        } catch (innerErr) {
            console.warn('⚠️ Inner migration error:', innerErr.message);
        } finally {
            if (migrationPool) await migrationPool.end();
        }

        console.log('🎉 Database Initialization Complete.');

    } catch (error) {
        console.error('❌ Init Error:', error);
        throw error;
    }
}
