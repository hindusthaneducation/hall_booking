import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

export async function initDB() {
    console.log('🔄 Initializing Database...');
    console.log(`📡 Connecting to DB at ${process.env.DB_HOST}:${process.env.DB_PORT}...`);

    try {
        // Debug: Check DNS resolution
        try {
            const dns = await import('dns');
            const { promisify } = await import('util');
            const lookup = promisify(dns.lookup);
            if (process.env.DB_HOST) {
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
                host: process.env.DB_HOST,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: dbName,
                port: process.env.DB_PORT || 3306,
                connectTimeout: 60000,
                ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                    ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                    : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined)
            });
            await directConnection.end();
            console.log(`✅ Successfully connected to existing database '${dbName}'`);
        } catch (err) {
            // If direct connection fails (e.g. DB doesn't exist), try connecting to server root to create it
            if (err.code === 'BAD_DB_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
                console.log(`database '${dbName}' not found, attempting to create...`);
                const rootConnection = await mysql.createConnection({
                    host: process.env.DB_HOST,
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    port: process.env.DB_PORT || 3306,
                    connectTimeout: 60000,
                    ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                        ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                        : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined)
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
            host: process.env.DB_HOST,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: process.env.DB_PORT || 3306,
            connectTimeout: 60000,
            ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined),
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
            host: process.env.DB_HOST,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: process.env.DB_PORT || 3306,
            ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
                ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
                : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined)
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

            // New Columns Migration
            const newColumns = [
                { name: 'media_coordinator_name', type: 'VARCHAR(255)' },
                { name: 'contact_no', type: 'VARCHAR(50)' },
                { name: 'chief_guest_name', type: 'VARCHAR(255)' },
                { name: 'chief_guest_designation', type: 'VARCHAR(255)' },
                { name: 'chief_guest_organization', type: 'VARCHAR(255)' },
                { name: 'chief_guest_photo_url', type: 'VARCHAR(1000)' },
                { name: 'event_partner_organization', type: 'VARCHAR(255)' },
                { name: 'event_partner_details', type: 'TEXT' },
                { name: 'event_partner_logo_url', type: 'VARCHAR(1000)' },
                { name: 'event_coordinator_name', type: 'VARCHAR(255)' },
                { name: 'event_convenor_details', type: 'TEXT' },
                { name: 'in_house_guest', type: 'TEXT' },
                { name: 'is_ac', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'is_fan', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'is_photography', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'work_status', type: 'ENUM("pending", "completed") DEFAULT "pending"' },
                { name: 'final_file_url', type: 'VARCHAR(1000)' },
                { name: 'files_urls', type: 'JSON' }
            ];

            for (const col of newColumns) {
                console.log(`⏳ Checking for ${col.name}...`);
                try {
                    await migrationPool.query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ ${col.name} column added.`);
                } catch (e) {
                    if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                        console.log(`✅ ${col.name} already exists.`);
                    } else {
                        console.error(`❌ Failed to add ${col.name}:`, e.message);
                        // Don't throw, try next
                    }
                }
            }


        } catch (migErr) {
            console.warn('⚠️ Schema migration warning:', migErr.message);
        }

        try {
            console.log('⏳ Checking for photography_drive_link in bookings...');
            await migrationPool.query('ALTER TABLE bookings ADD COLUMN photography_drive_link VARCHAR(1000)');
            console.log('✅ photography_drive_link column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                console.log('✅ photography_drive_link already exists.');
            } else {
                console.warn('⚠️ Could not add photography_drive_link:', e.message);
            }
        }

        try {
            console.log('⏳ Updating role ENUM for users to include photography_team...');
            // Note: We include designing_team from previous context, and add photography_team
            await migrationPool.query("ALTER TABLE users MODIFY COLUMN role ENUM('department_user', 'principal', 'super_admin', 'designing_team', 'photography_team', 'press_release_team') NOT NULL DEFAULT 'department_user'");
            console.log('✅ Role ENUM updated.');
        } catch (e) {
            console.warn('⚠️ Could not update role ENUM:', e.message);
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

            try {
                console.log('⏳ Checking for theme_preference in users...');
                await migrationPool.query("ALTER TABLE users ADD COLUMN theme_preference VARCHAR(50) DEFAULT 'hindusthan'");
                console.log('✅ theme_preference column added.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ theme_preference already exists.');
                } else {
                    console.warn('⚠️ Could not add theme_preference:', e.message);
                }
            }

            try {
                console.log('⏳ Checking for press_releases table...');
                // Create press_releases table
                await migrationPool.query(`
                    CREATE TABLE IF NOT EXISTS press_releases (
                        id CHAR(36) PRIMARY KEY,
                        user_id CHAR(36) NOT NULL,
                        department_id CHAR(36) NOT NULL,
                        coordinator_name VARCHAR(255) NOT NULL,
                        event_title VARCHAR(255) NOT NULL,
                        event_date DATE NOT NULL,
                        english_writeup TEXT,
                        tamil_writeup TEXT,
                        photo_description TEXT,
                        photos JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        FOREIGN KEY (department_id) REFERENCES departments(id)
                    )
                `);
                console.log('✅ press_releases table checked/created.');
            } catch (e) {
                console.warn('⚠️ Could not create press_releases table:', e.message);
            }

            console.log('✅ press_releases table checked/created.');

            console.log('⏳ Checking for booking_id in press_releases...');
            try {
                await migrationPool.query("ALTER TABLE press_releases ADD COLUMN booking_id CHAR(36)");
                await migrationPool.query("ALTER TABLE press_releases ADD CONSTRAINT fk_pr_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)");
                console.log('✅ booking_id column added to press_releases.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ booking_id already exists in press_releases.');
                } else {
                    console.log('⚠️ Could not add booking_id (might already exist or foreign key issue):', e.message);
                }
            }

            console.log('⏳ Checking for status in press_releases...');
            try {
                await migrationPool.query("ALTER TABLE press_releases ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
                console.log('✅ status column added to press_releases.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log('✅ status column already exists in press_releases.');
                } else {
                    console.log('⚠️ Could not add status column:', e.message);
                }
            }



            await migrationPool.end();

            console.log('🎉 Database Initialization Complete.');
        } catch (error) {
            console.error('❌ Init Error:', error);
            throw error;
        }
    } catch (outerError) {
        console.error('❌ Outer Init Error:', outerError);
        throw outerError;
    }
}
