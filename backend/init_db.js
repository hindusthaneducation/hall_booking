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

    // Connect to check/create DB
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
    });

    try {
        const dbName = process.env.DB_NAME || 'hall_booking_system';

        // NOTE: Many cloud providers don't allow creating DBs via connection, they give you a specific DB.
        // We'll wrap this in try-catch to ignore if we can't create it (it likely exists).
        try {
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
            console.log(`✅ Database '${dbName}' ensured.`);
        } catch (e) {
            console.log(`⚠️  Could not check/create DB (might be restricted cloud user): ${e.message}`);
        }
        await connection.end();

        // Connect to DB to run schema
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            port: process.env.DB_PORT || 3306,
            ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
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
        console.log('🎉 Database Initialization Complete.');
    } catch (error) {
        console.error('❌ Init Error:', error);
        throw error;
    }
}
