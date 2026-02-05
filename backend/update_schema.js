import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateSchema() {
    console.log('🔄 Updating Database Schema...');

    const dbName = process.env.DB_NAME || 'hall_booking_system';

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        port: process.env.DB_PORT || 3306,
        connectTimeout: 60000,
        ssl: fs.existsSync(path.join(__dirname, 'ca.pem'))
            ? { ca: fs.readFileSync(path.join(__dirname, 'ca.pem')) }
            : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined)
    });

    try {
        const columns = [
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
            { name: 'files_urls', type: 'JSON' }
        ];

        for (const col of columns) {
            console.log(`⏳ Adding column ${col.name}...`);
            try {
                await pool.query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ ${col.name} column added.`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060) {
                    console.log(`✅ ${col.name} already exists.`);
                } else {
                    console.error(`❌ Failed to add ${col.name}:`, e.message);
                }
            }
        }

    } catch (err) {
        console.error('❌ Update Error:', err);
    } finally {
        await pool.end();
        console.log('🏁 Schema Update Finished.');
    }
}

updateSchema();
