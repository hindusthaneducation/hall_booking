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
        console.log('🎉 Database Initialization Complete.');
    } catch (error) {
        console.error('❌ Init Error:', error);
        throw error;
    }
}
