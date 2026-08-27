import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// --- IMPORTANT: Webhook Endpoint ---
// This is the URL Telegram will send updates to.
// It MUST be served over HTTPS.
app.post('/webhook', async (req: Request, res: Response) => {
    // 1. Security Check (Highly Recommended, but advanced setup involves checking the X-Telegram-Bot-Api-Secret-Token header)
    // For a basic setup, you can skip complex header checks for now, but be aware of the security implications.
    
    // 2. Parse the incoming data
    const update = req.body;

    if (!update) {
        console.log('Received request with empty body.');
        return res.status(400).send({ error: 'No update data received' });
    }
    
    console.log('--- Received Telegram Update ---');
    console.log('Update ID:', update.update_id);
    console.log('Message Text:', update.message?.text || 'No text found');
    console.log('From User:', update.from?.first_name || 'Unknown');
    
    // 3. YOUR CUSTOM CONNECTOR LOGIC GOES HERE
    try {
        // Example: Call your external service or database connector
        await processTelegramMessage(update);
        
        // 4. Respond to Telegram
        // It is crucial to respond with a 200 OK status so Telegram knows the webhook was successfully processed.
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing Telegram update:', error);
        // Respond with an error status if processing fails so Telegram knows to retry.
        res.status(500).send('Error processing request');
    }
});


/**
 * Placeholder function for your actual connector logic.
 * Replace this with code that connects to your services.
 * @param update The parsed Telegram update object.
 */
async function processTelegramMessage(update: any) {
    // --- CUSTOM CONNECTOR LOGIC ---
    console.log(`[CONNECTOR]: Starting to connect for message from ${update.from.id}`);
    
    // Example: If you have a database, you'd connect it here:
    // await database.saveMessage(update.chat.id, update.message.text);
    
    console.log(`[CONNECTOR]: Successfully processed message for chat ID ${update.chat.id}`);
    // ------------------------------
}


// Start the server
app.listen(PORT, () => {
    console.log(`✅ Telegram Connector running on port ${PORT}`);
    console.log(`🌐 Webhook endpoint is: ${process.env.PUBLIC_URL}`);
});