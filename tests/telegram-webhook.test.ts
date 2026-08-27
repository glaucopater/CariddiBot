/**
 * Unit tests for the Telegram Webhook Netlify Function.
 *
 * Strategy: mock the `telegraf` module so that `new Telegraf(...)` returns
 * a controllable spy, then exercise the real handler logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handler } from "../netlify/functions/telegram-webhook";
import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

// ── Mock telegraf BEFORE importing the handler ──────────────
const mockHandleUpdate = vi.fn().mockResolvedValue(undefined);

vi.mock("telegraf", () => ({
  Telegraf: vi.fn().mockImplementation(() => ({
    handleUpdate: mockHandleUpdate,
  })),
}));

// Set env vars BEFORE importing the handler (module-scoped Bot init)
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_SECRET_TOKEN = "my-secret-token";

// ── Helpers ──────────────────────────────────────────────────
const VALID_HEADERS = {
  "x-telegram-bot-api-secret-token": "my-secret-token",
};

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    rawUrl: "https://example.netlify.app/.netlify/functions/telegram-webhook",
    rawQuery: "",
    path: "/.netlify/functions/telegram-webhook",
    httpMethod: "POST",
    headers: { ...VALID_HEADERS },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: JSON.stringify({ update_id: 1, message: { text: "hello" } }),
    isBase64Encoded: false,
    ...overrides,
  } as HandlerEvent;
}

function invoke(event: HandlerEvent): Promise<HandlerResponse | void> {
  return Promise.resolve(handler(event, {} as any)) as Promise<HandlerResponse | void>;
}

// ── Tests ────────────────────────────────────────────────────
describe("telegramWebhook handler", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // 1 ─ Method guard ──────────────────────────────────────────
  it("rejects non-POST requests with 405", async () => {
    const res = (await invoke(
      makeEvent({ httpMethod: "GET" }),
    )) as HandlerResponse;

    expect(res.statusCode).toBe(405);
    expect(res.body).toContain("Method not allowed");
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  // 2 ─ Security: wrong token ─────────────────────────────────
  it("rejects requests with an invalid secret token (401)", async () => {
    const res = (await invoke(
      makeEvent({
        headers: { "x-telegram-bot-api-secret-token": "wrong-token" },
      }),
    )) as HandlerResponse;

    expect(res.statusCode).toBe(401);
    expect(res.body).toContain("Unauthorized");
    expect(mockHandleUpdate).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith("Invalid secret token received");
  });

  // 3 ─ Security: no token in headers ─────────────────────────
  it("rejects requests missing the secret token header (401)", async () => {
    const res = (await invoke(
      makeEvent({ headers: {} }),
    )) as HandlerResponse;

    expect(res.statusCode).toBe(401);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  // 4 ─ Happy path ────────────────────────────────────────────
  it("processes a valid POST and returns 200", async () => {
    const res = (await invoke(makeEvent())) as HandlerResponse;
    const expectedUpdate = JSON.parse(
      makeEvent().body as string,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ received: true });
    expect(mockHandleUpdate).toHaveBeenCalledTimes(1);
    expect(mockHandleUpdate).toHaveBeenCalledWith(expectedUpdate);
  });

  // 5 ─ Base64-encoded body (Netlify may send base64) ─────────
  it("decodes base64-encoded body before processing", async () => {
    const rawUpdate = { update_id: 99, message: { text: "base64 test" } };
    const encoded = Buffer.from(JSON.stringify(rawUpdate), "utf8").toString("base64");

    const res = (await invoke(
      makeEvent({ body: encoded, isBase64Encoded: true }),
    )) as HandlerResponse;

    expect(res.statusCode).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalledWith(rawUpdate);
  });

  // 6 ─ Bad JSON body ─────────────────────────────────────────
  it("returns 500 when the body is not valid JSON", async () => {
    const res = (await invoke(
      makeEvent({ body: "{invalid json!!" }),
    )) as HandlerResponse;

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain("Internal server error");
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  // 7 ─ Empty body ────────────────────────────────────────────
  it("returns 500 when the body is empty", async () => {
    const res = (await invoke(
      makeEvent({ body: null }),
    )) as HandlerResponse;

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain("Internal server error");
  });
});
