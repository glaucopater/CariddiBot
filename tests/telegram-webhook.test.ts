/**
 * Unit tests for the Telegram Webhook Netlify Function.
 *
 * Telegraf is mocked so tests exercise the real Netlify handler without
 * contacting Telegram or requiring real Netlify environment variables.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

const mocks = vi.hoisted(() => ({
  mockHandleUpdate: vi.fn().mockResolvedValue(undefined),
  mockStart: vi.fn(),
  mockOn: vi.fn(),
}));

vi.mock('telegraf', () => ({
  Telegraf: vi.fn().mockImplementation(() => ({
    handleUpdate: mocks.mockHandleUpdate,
    start: mocks.mockStart,
    on: mocks.mockOn,
  })),
}));

const validHeaders = {
  'x-telegram-bot-api-secret-token': 'my-secret-token',
};

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: 'https://example.netlify.app/.netlify/functions/telegram-webhook',
    rawQuery: '',
    path: '/.netlify/functions/telegram-webhook',
    httpMethod: 'POST',
    headers: { ...validHeaders },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: JSON.stringify({ update_id: 1, message: { text: 'hello' } }),
    isBase64Encoded: false,
    ...overrides,
  } as HandlerEvent;
}

async function loadHandler(): Promise<Handler> {
  const module = await import('../netlify/functions/telegram-webhook');
  return module.handler;
}

describe('telegramWebhook handler', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-bot-token');
    vi.stubEnv('TELEGRAM_SECRET_TOKEN', 'my-secret-token');
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('rejects non-POST requests with 405', async () => {
    const handler = await loadHandler();
    const res = (await handler(makeEvent({ httpMethod: 'GET' }), {} as never)) as HandlerResponse;

    expect(res.statusCode).toBe(405);
    expect(res.body).toContain('Method not allowed');
    expect(mocks.mockHandleUpdate).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid secret token (401)', async () => {
    const handler = await loadHandler();
    const res = (await handler(
      makeEvent({
        headers: { 'x-telegram-bot-api-secret-token': 'wrong-token' },
      }),
      {} as never,
    )) as HandlerResponse;

    expect(res.statusCode).toBe(401);
    expect(res.body).toContain('Unauthorized');
    expect(mocks.mockHandleUpdate).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Rejected Telegram webhook request: invalid secret token',
    );
  });

  it('rejects requests missing the secret token header (401)', async () => {
    const handler = await loadHandler();
    const res = (await handler(makeEvent({ headers: {} }), {} as never)) as HandlerResponse;

    expect(res.statusCode).toBe(401);
    expect(mocks.mockHandleUpdate).not.toHaveBeenCalled();
  });

  it('processes a valid POST and returns 200', async () => {
    const handler = await loadHandler();
    const event = makeEvent();
    const expectedUpdate = JSON.parse(event.body as string);
    const res = (await handler(event, {} as never)) as HandlerResponse;

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ received: true });
    expect(mocks.mockHandleUpdate).toHaveBeenCalledWith(expectedUpdate);
  });

  it('decodes base64-encoded body before processing', async () => {
    const handler = await loadHandler();
    const rawUpdate = { update_id: 99, message: { text: 'base64 test' } };
    const encoded = Buffer.from(JSON.stringify(rawUpdate), 'utf8').toString('base64');
    const res = (await handler(
      makeEvent({ body: encoded, isBase64Encoded: true }),
      {} as never,
    )) as HandlerResponse;

    expect(res.statusCode).toBe(200);
    expect(mocks.mockHandleUpdate).toHaveBeenCalledWith(rawUpdate);
  });

  it('returns 500 when the body is not valid JSON', async () => {
    const handler = await loadHandler();
    const res = (await handler(makeEvent({ body: '{invalid json!!' }), {} as never)) as HandlerResponse;

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain('Internal server error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mocks.mockHandleUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when the body is empty', async () => {
    const handler = await loadHandler();
    const res = (await handler(makeEvent({ body: null }), {} as never)) as HandlerResponse;

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain('Internal server error');
  });
});
