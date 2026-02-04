
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hall_booking'
};

const addColumns = async () => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database.');

        // Add work_status column
        try {
            await connection.query(`
                ALTER TABLE bookings 
                ADD COLUMN work_status ENUM('pending', 'completed') DEFAULT 'pending'
            `);
            console.log('✅ Added work_status column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ work_status column already exists.');
            } else {
                throw err;
            }
        }

        // Add final_file_url column
        try {
            await connection.query(`
                ALTER TABLE bookings 
                ADD COLUMN final_file_url TEXT DEFAULT NULL
            `);
            console.log('✅ Added final_file_url column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ final_file_url column already exists.');
            } else {
                throw err;
            }
        }

        console.log('✨ Schema update completed.');

    } catch (error) {
        console.error('❌ Schema update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

addColumns();
