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
        user: sanitize(process.env.MAIL_USER || ''),
        pass: sanitize(process.env.MAIL_PASS || '').replace(/\s+/g, '')
    },
    // Debug settings to see SMTP traffic in logs
    logger: true,
    debug: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

export const sendEmail = async (to, subject, html) => {
    const sgApiKey = sanitize(process.env.SENDGRID_API_KEY);
    if (sgApiKey) {
        try {
            const fromEmail = sanitize(process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_USER || 'no-reply@hindusthan.net');
            console.log(`📧 Sending email via SendGrid API to: ${to} from: ${fromEmail}`);
            
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sgApiKey}`
                },
                body: JSON.stringify({
                    personalizations: [{
                        to: [{ email: to }]
                    }],
                    from: {
                        email: fromEmail,
                        name: 'Hall Booking System'
                    },
                    subject: subject,
                    content: [{
                        type: 'text/html',
                        value: html
                    }]
                })
            });

            if (response.ok) {
                console.log('📧 Email sent successfully via SendGrid API');
                return true;
            } else {
                const errText = await response.text();
                console.error('❌ SendGrid API failed:', response.status, errText);
                return false;
            }
        } catch (error) {
            console.error('❌ SendGrid API connection error:', error);
            return false;
        }
    }

    // Fallback to SMTP
    try {
        const info = await transporter.sendMail({
            from: `"Hall Booking System" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log('📧 Email sent via SMTP:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ SMTP Email failed:', error);
        return false;
    }
}

export const verifyConnection = async () => {
    if (process.env.SENDGRID_API_KEY) {
        console.log('✅ Email Service: SendGrid API configuration detected.');
        return true;
    }
    try {
        console.log(`📧 Attempting to connect to SMTP Gmail as: ${process.env.MAIL_USER || '(Not Set)'}`);
        await transporter.verify();
        console.log('✅ SMTP Email Service is Ready & Connected.');
        return true;
    } catch (error) {
        console.error('❌ SMTP Email Connection Failed:', error.message);
        if (error.code === 'EAUTH') console.error('   -> Hint: Check MAIL_USER and MAIL_PASS in Render Environment.');
        return false;
    }
};

export const getBookingTemplate = (status, data) => {
    const { user_name, hall_name, booking_date, event_time, event_title, rejection_reason, reason, download_url, photography_drive_link, submission_url } = data;
    const displayReason = reason || rejection_reason;

    let formattedDate = '';
    if (booking_date) {
        if (booking_date instanceof Date) {
            formattedDate = booking_date.toISOString().split('T')[0];
        } else if (typeof booking_date === 'string') {
            formattedDate = booking_date.split('T')[0];
        } else {
            formattedDate = String(booking_date);
        }
    }

    let color = '#3b82f6'; // blue
    let title = 'Booking Update';
    let message = '';

    switch (status) {
        case 'pending':
            color = '#f59e0b'; // amber
            title = 'Booking Received';
            message = `Your booking for <b>${hall_name}</b> on ${formattedDate} has been received. <br>After verification, we will process your request and update the status.`;
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
        case 'design_completed':
            color = '#8b5cf6'; // purple
            title = 'Design Assets Uploaded! 🎨';
            message = `Good news! The designing team has uploaded the final design assets for your event in <b>${hall_name}</b>.<br><br>
                       You can download the design assets by clicking the button below:<br>
                       <a href="${download_url || '#'}" style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.4);">Download Design Assets</a>`;
            break;
        case 'photos_uploaded':
            color = '#06b6d4'; // cyan
            title = 'Event Photos Uploaded! 📸';
            message = `Good news! The photography team has uploaded the photos for your event in <b>${hall_name}</b>.<br><br>
                       You can access and download the photos via the Google Drive link below:<br>
                       <a href="${photography_drive_link || '#'}" style="display: inline-block; background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; box-shadow: 0 4px 6px -1px rgba(6, 182, 212, 0.4);">View Event Photos</a>`;
            break;
        case 'press_release_reminder':
            color = '#f59e0b'; // amber
            title = 'Press Release Reminder 📝';
            message = `We hope your event <b>${event_title}</b> in <b>${hall_name}</b> yesterday was a grand success!<br><br>
                       This is a friendly reminder to please submit the press release write-up (in English and Tamil, along with photos) on the portal so our press relations team can publish it.<br><br>
                       Please click the button below to submit your write-up:
                       <br>
                       <a href="${submission_url || '#'}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.4);">Submit Press Release</a>`;
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
                    <li style="margin-bottom: 8px;">📅 <strong>Date:</strong> ${formattedDate}</li>
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
