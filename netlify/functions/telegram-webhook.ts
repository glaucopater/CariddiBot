import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { Telegraf } from 'telegraf';

// --- 1. Setup ---

// Initialize bot with token from environment variables.
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// --- 2. Netlify Handler Logic ---
const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // 1. Method Check: Only accept POST requests from Telegram
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // 2. Security Check: Verify the secret token (Highly recommended for production)
  const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
  const receivedToken = event.headers['x-telegram-bot-api-secret-token'];

  if (secretToken && receivedToken !== secretToken) {
    console.warn('Invalid secret token received');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  // 3. Parse the Body
  let body = event.body || '';
  if (event.isBase64Encoded) {
    // Decode the body if Netlify encoded it as Base64
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  try {
    const update = JSON.parse(body);

    // 4. Process the update using Telegraf (Custom Connector Logic)
    // We call the Telegraf functionality here directly.
    await bot.handleUpdate(update);

    // 5. Successful Response (CRITICAL for Telegram)
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    // 6. Error Handling: Log and return a 500 status
    console.error('Error processing update:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };
