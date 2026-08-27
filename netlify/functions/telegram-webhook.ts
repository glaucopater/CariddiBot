import type { Handler, HandlerContext, HandlerEvent } from '@netlify/functions';
import { Telegraf } from 'telegraf';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const bot = new Telegraf(botToken);

bot.start(async (ctx) => {
  await ctx.reply('Hello! CariddiBot is online. Send me a message to test the webhook.');
});

bot.on('text', async (ctx) => {
  await ctx.reply(`Received: ${ctx.message.text}`);
});

const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
  const receivedToken = event.headers['x-telegram-bot-api-secret-token'];

  if (secretToken && receivedToken !== secretToken) {
    console.warn('Rejected Telegram webhook request: invalid secret token');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  let body = event.body ?? '';
  if (event.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  try {
    const update = JSON.parse(body);
    console.log('Processing Telegram update', { updateId: update.update_id });
    await bot.handleUpdate(update);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing Telegram update', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };
