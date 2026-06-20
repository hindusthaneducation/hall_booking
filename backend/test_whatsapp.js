import dotenv from 'dotenv';
dotenv.config();
import { sendWhatsApp } from './whatsapp.js';

const testRecipient = process.argv[2];
const testMessage = process.argv[3] || "Hello! This is a test message from the Hall Booking Management System WhatsApp integration. 📱";

if (!testRecipient) {
    console.log("\n=======================================================");
    console.log("Hall Booking System - WhatsApp Integration Test Tool");
    console.log("=======================================================\n");
    console.log("Usage:");
    console.log("  node test_whatsapp.js <phone_number> [message]\n");
    console.log("Examples:");
    console.log("  node test_whatsapp.js +919876543210");
    console.log("  node test_whatsapp.js 9876543210 \"Hello from the app!\"\n");
    console.log("Note: Make sure to define WHATSAPP_ACCESS_TOKEN and");
    console.log("      WHATSAPP_PHONE_NUMBER_ID in backend/.env before running.");
    console.log("=======================================================\n");
    process.exit(1);
}

console.log(`📱 Initiating test WhatsApp message to: ${testRecipient}`);
console.log(`💬 Message body: "${testMessage}"`);

sendWhatsApp(testRecipient, testMessage)
    .then(success => {
        if (success) {
            console.log("\n✅ Test WhatsApp message sent successfully!");
        } else {
            console.log("\n❌ Failed to send test WhatsApp message.");
            console.log("Check that your WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are correct in backend/.env");
        }
    })
    .catch(err => {
        console.error("\n💥 Fatal error during dispatch:", err);
    });
