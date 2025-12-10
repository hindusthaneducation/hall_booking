import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Sanitize credentials (remove surrounding quotes if user pasted them)
const sanitize = (str) => str ? str.replace(/^["'](.*)["']$/, '$1') : str;

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: sanitize(process.env.MAIL_USER),
        pass: sanitize(process.env.MAIL_PASS)
    },
    // Debug settings to see SMTP traffic in logs
    logger: true,
    debug: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

export const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Hall Booking System" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log('📧 Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Email failed:', error);
        return false;
    }
}

export const verifyConnection = async () => {
    try {
        console.log(`📧 Attempting to connect to Gmail as: ${process.env.MAIL_USER || '(Not Set)'}`);
        await transporter.verify();
        console.log('✅ Email Service is Ready & Connected.');
        return true;
    } catch (error) {
        console.error('❌ Email Connection Failed:', error.message);
        if (error.code === 'EAUTH') console.error('   -> Hint: Check MAIL_USER and MAIL_PASS in Render Environment.');
        return false;
    }
};

export const getBookingTemplate = (status, data) => {
    const { user_name, hall_name, booking_date, event_time, event_title, rejection_reason, reason } = data;
    const displayReason = reason || rejection_reason;

    let color = '#3b82f6'; // blue
    let title = 'Booking Update';
    let message = '';

    switch (status) {
        case 'pending':
            color = '#f59e0b'; // amber
            title = 'Booking Received';
            message = `Your booking for <b>${hall_name}</b> on ${booking_date} has been received. <br>After verification, we will process your request and update the status.`;
            break;
        case 'approved':
            color = '#10b981'; // green
            title = 'Booking Approved! 🎉';
            message = `Good news! Your booking for <b>${hall_name}</b> has been approved.`;
            break;
        case 'rejected':
            color = '#ef4444'; // red
            title = 'Booking Rejected';
            message = `We regret to inform you that your booking for <b>${hall_name}</b> has been rejected.`;
            break;
        case 'updated':
            color = '#3b82f6'; // blue
            title = 'Booking Updated';
            message = `The details of your booking for <b>${hall_name}</b> have been updated by the administrator.`;
            break;
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${color}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">${title}</h1>
        </div>
        <div style="padding: 20px;">
            <p>Dear ${user_name},</p>
            <p>${message}</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Event Details:</h3>
                <ul style="list-style: none; padding: 0; margin: 0; color: #4b5563;">
                    <li style="margin-bottom: 8px;">📅 <strong>Date:</strong> ${booking_date}</li>
                    <li style="margin-bottom: 8px;">⏰ <strong>Time:</strong> ${event_time}</li>
                    <li style="margin-bottom: 8px;">🏛️ <strong>Hall:</strong> ${hall_name}</li>
                    <li style="margin-bottom: 8px;">📝 <strong>Event:</strong> ${event_title}</li>
                    ${displayReason ? `<li style="margin-top: 12px; color: #dc2626;">⚠️ <strong>Reason:</strong> ${displayReason}</li>` : ''}
                </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Log in to the portal for more details.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
            Hindusthan Educational Institutions
        </div>
    </div>
    `;
};
