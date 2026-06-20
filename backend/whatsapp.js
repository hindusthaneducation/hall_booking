import dotenv from 'dotenv';
dotenv.config();

// Helper to sanitize quotes from environment variables
const sanitize = (str) => str ? str.replace(/^["'](.*)["']$/, '$1') : str;

/**
 * Normalizes phone numbers to standard format.
 * - Handles 10 digit Indian mobile numbers by prepending '+91'
 * - Removes non-numeric characters (except leading '+')
 */
export const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.trim().replace(/[^\d+]/g, '');
    
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+91' + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        cleaned = '+' + cleaned;
    }
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
        cleaned = '+' + cleaned;
    }
    return cleaned;
};

/**
 * Get formatting template for WhatsApp text message.
 */
export const getWhatsAppMessage = (status, data) => {
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

    switch (status) {
        case 'pending':
            return `Hello ${user_name},\n\nYour booking request for ${hall_name} on ${formattedDate} (${event_time}) for "${event_title}" has been successfully received and is pending approval.\n\nThank you,\nHindusthan Educational Institutions`;
        case 'approved':
            return `Hello ${user_name},\n\nGreat news! Your booking request for ${hall_name} on ${formattedDate} (${event_time}) for "${event_title}" has been APPROVED. 🎉\n\nThank you,\nHindusthan Educational Institutions`;
        case 'rejected':
            return `Hello ${user_name},\n\nWe regret to inform you that your booking request for ${hall_name} on ${formattedDate} for "${event_title}" has been rejected.\n\nReason: ${displayReason || 'Not specified'}\n\nThank you,\nHindusthan Educational Institutions`;
        case 'updated':
            return `Hello ${user_name},\n\nYour booking request details for ${hall_name} on ${formattedDate} (${event_time}) for "${event_title}" have been updated.\n\nRemarks: ${displayReason || 'Details updated'}\n\nThank you,\nHindusthan Educational Institutions`;
        case 'cancelled':
            return `Hello ${user_name},\n\nYour booking request for ${hall_name} on ${formattedDate} for "${event_title}" has been cancelled.\n\nReason: ${displayReason || 'Cancelled by administrator'}\n\nThank you,\nHindusthan Educational Institutions`;
        case 'design_completed':
            return `Hello ${user_name},\n\nGreat news! The designing team has uploaded the final design assets for your event "${event_title}" at ${hall_name} on ${formattedDate}.\n\nYou can download the design assets here: ${download_url || 'N/A'}\n\nThank you,\nHindusthan Educational Institutions`;
        case 'photos_uploaded':
            return `Hello ${user_name},\n\nGreat news! The photography team has uploaded the photos for your event "${event_title}" at ${hall_name} on ${formattedDate}.\n\nYou can access the photo folder here: ${photography_drive_link || 'N/A'}\n\nThank you,\nHindusthan Educational Institutions`;
        case 'press_release_reminder':
            return `Hello ${user_name},\n\nWe hope your event "${event_title}" at ${hall_name} yesterday was successful! 👍\n\nThis is a friendly reminder to please submit the event's press release write-up and photos on the Hall Booking Portal.\n\nSubmit here: ${submission_url || 'N/A'}\n\nThank you,\nHindusthan Educational Institutions`;
        default:
            return `Hello ${user_name},\n\nThere is an update on your booking request for ${hall_name} on ${formattedDate}.\n\nThank you,\nHindusthan Educational Institutions`;
    }
};

/**
 * Dispatches a WhatsApp message using configured provider:
 * 1. Twilio
 * 2. Meta WhatsApp Business Cloud API
 * 3. Custom API URL (Webhook GET/POST)
 */
export const sendWhatsApp = async (to, message) => {
    if (!to) {
        console.warn('⚠️ Cannot send WhatsApp: No contact number provided.');
        return false;
    }

    const normalized = normalizePhoneNumber(to);
    const digitsOnly = normalized.replace('+', '');

    console.log(`📱 Preparing to send WhatsApp message to: ${normalized}`);

    // --- Provider 1: Twilio ---
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
            const sid = sanitize(process.env.TWILIO_ACCOUNT_SID);
            const token = sanitize(process.env.TWILIO_AUTH_TOKEN);
            const from = sanitize(process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886');

            console.log('📱 Dispatching via Twilio WhatsApp API...');

            const bodyParams = new URLSearchParams({
                To: `whatsapp:${normalized}`,
                From: from,
                Body: message
            });

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: bodyParams.toString()
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ WhatsApp sent via Twilio. SID:', data.sid);
                return true;
            } else {
                const errText = await response.text();
                console.error('❌ Twilio WhatsApp API error:', response.status, errText);
                return false;
            }
        } catch (error) {
            console.error('❌ Twilio WhatsApp service error:', error);
            return false;
        }
    }

    // --- Provider 2: Meta / WhatsApp Cloud API ---
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        try {
            const token = sanitize(process.env.WHATSAPP_ACCESS_TOKEN);
            const phoneId = sanitize(process.env.WHATSAPP_PHONE_NUMBER_ID);

            console.log('📱 Dispatching via Meta WhatsApp Cloud API...');

            const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: digitsOnly,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: message
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ WhatsApp sent via Meta Cloud API. MsgID:', data.messages?.[0]?.id);
                return true;
            } else {
                const errText = await response.text();
                console.error('❌ Meta WhatsApp API error:', response.status, errText);
                return false;
            }
        } catch (error) {
            console.error('❌ Meta WhatsApp service error:', error);
            return false;
        }
    }

    // --- Provider 3: Custom HTTP API URL ---
    if (process.env.WHATSAPP_API_URL) {
        try {
            const method = (process.env.WHATSAPP_API_METHOD || 'GET').toUpperCase();
            
            // Construct request URL by replacing placeholders
            let url = sanitize(process.env.WHATSAPP_API_URL);
            url = url
                .replace('{{phone}}', encodeURIComponent(normalized))
                .replace('{{phone_raw}}', encodeURIComponent(digitsOnly))
                .replace('{{message}}', encodeURIComponent(message));

            console.log(`📱 Dispatching via Custom API URL (${method}):`, url.split('?')[0]);

            let headers = {
                'Accept': 'application/json'
            };

            // Custom headers support (if provided in env as JSON)
            if (process.env.WHATSAPP_API_HEADERS) {
                try {
                    const parsedHeaders = JSON.parse(process.env.WHATSAPP_API_HEADERS);
                    headers = { ...headers, ...parsedHeaders };
                } catch (e) {
                    console.error('⚠️ Failed to parse WHATSAPP_API_HEADERS as JSON:', e.message);
                }
            }

            let requestOptions = {
                method,
                headers
            };

            // If POST/PUT, custom body support
            if (['POST', 'PUT', 'PATCH'].includes(method) && process.env.WHATSAPP_API_BODY) {
                headers['Content-Type'] = 'application/json';
                let bodyTemplate = process.env.WHATSAPP_API_BODY;
                bodyTemplate = bodyTemplate
                    .replace('{{phone}}', normalized)
                    .replace('{{phone_raw}}', digitsOnly)
                    .replace('{{message}}', message);
                requestOptions.body = bodyTemplate;
            }

            const response = await fetch(url, requestOptions);

            if (response.ok) {
                console.log('✅ WhatsApp sent via Custom API Gateway');
                return true;
            } else {
                const errText = await response.text();
                console.error('❌ Custom WhatsApp API error:', response.status, errText);
                return false;
            }
        } catch (error) {
            console.error('❌ Custom WhatsApp Gateway error:', error);
            return false;
        }
    }

    console.warn('⚠️ WhatsApp notification skipped: No WhatsApp credentials (Twilio, Meta, or Custom URL) configured in .env');
    return false;
};
