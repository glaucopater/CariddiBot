# CariddiBot

Telegram connector bot deployed on Netlify Functions.

## Features

- Receives Telegram updates via webhook
- Processes messages and commands
- Runs serverless on Netlify

## Prerequisites

- Node.js 20+
- Yarn
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Netlify account

## Local Development

```bash
# Install dependencies
yarn install

# Create .env with your bot token
cp .env.example .env
# Edit .env and add TELEGRAM_BOT_TOKEN and TELEGRAM_SECRET_TOKEN

# Run dev server
yarn dev
```

The dev server runs at `http://localhost:8888/.netlify/functions/telegram-webhook`.

## Deployment to Netlify

### 1. Set environment variables

In your Netlify site settings, add:

- `TELEGRAM_BOT_TOKEN` – your bot token from BotFather
- `TELEGRAM_SECRET_TOKEN` – a random secret (e.g., `openssl rand -hex 32`)

### 2. Deploy

```bash
# Install Netlify CLI (optional)
npm install -g netlify-cli

# Link to your site
netlify link

# Deploy
netlify deploy --prod
```

Or push to your branch and Netlify will auto-deploy.

### 3. Build output

The build publishes the `public/` directory (landing page) and deploys functions from `netlify/functions/`.

## Webhook Setup

### Register the webhook

Run this once (replace placeholders):

```bash
curl -v "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://cariddibot.netlify.app/.netlify/functions/telegram-webhook&secret_token=<YOUR_SECRET_TOKEN>"
```

Expected response:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Verify webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Check that:
- `url` matches your Netlify function URL
- `has_custom_webhook_certificate` is `false`
- `last_error_date` is not recent

## Testing

### Send a test message

1. Open your bot in Telegram
2. Send `/start` or any message
3. Check Netlify Functions logs for `telegram-webhook`

### Check logs

- Netlify Dashboard → Functions → `telegram-webhook` → Logs
- Or use Netlify CLI: `netlify functions:log telegram-webhook`

### Troubleshooting

- **401/403 errors**: Ensure `TELEGRAM_SECRET_TOKEN` matches the one used in `setWebhook`
- **Timeouts**: Netlify functions have a 10s timeout; long operations may fail
- **Env vars not found**: Redeploy after adding env vars in Netlify

## Project Structure

```
├── netlify/
│   └── functions/
│       └── telegram-webhook.ts  # Webhook handler
├── public/
│   └── index.html               # Landing page
├── netlify.toml                 # Netlify config
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

```bash
yarn dev          # Start Netlify dev server
yarn build        # Build for production
yarn test         # Run tests
yarn test:ui      # Run tests with UI
```

## License

MIT
