import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import type { SentMessageInfo } from 'nodemailer';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { transporter } from '../lib/email.js';
import { config } from '../config.js';

const BASIC_EMAIL = 'forgot-basic@habit-forgot-test.com';
const TOKEN_EMAIL = 'forgot-token@habit-forgot-test.com';
const REPLACE_EMAIL = 'forgot-replace@habit-forgot-test.com';
const RATE_EMAIL = 'forgot-rate@habit-forgot-test.com';
const NONEXISTENT_EMAIL = 'nobody@habit-forgot-test.com';
const TEST_PASSWORD = 'StrongPass1';
const ALL_EMAILS = [BASIC_EMAIL, TOKEN_EMAIL, REPLACE_EMAIL, RATE_EMAIL];

const NEUTRAL_MESSAGE = 'If an account exists for that email, check your inbox for reset instructions.';

let tokenUserId: string;
let replaceUserId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  await prisma.user.create({ data: { email: BASIC_EMAIL, passwordHash } });
  const tokenUser = await prisma.user.create({ data: { email: TOKEN_EMAIL, passwordHash } });
  tokenUserId = tokenUser.id;
  const replaceUser = await prisma.user.create({ data: { email: REPLACE_EMAIL, passwordHash } });
  replaceUserId = replaceUser.id;
  await prisma.user.create({ data: { email: RATE_EMAIL, passwordHash } });
});

afterAll(async () => {
  await prisma.passwordResetToken.deleteMany({ where: { user: { email: { in: ALL_EMAILS } } } });
  await prisma.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/forgot-password', () => {
  const mockSendInfo: SentMessageInfo = {
    messageId: '<test@mock>',
    accepted: [],
    rejected: [],
    pending: [],
    response: '250 OK',
    envelope: { from: '', to: [] },
    message: '{}',
  };

  beforeEach(() => {
    jest.spyOn(transporter, 'sendMail').mockResolvedValue(mockSendInfo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 200 with neutral message for existing email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: BASIC_EMAIL });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe(NEUTRAL_MESSAGE);
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    const [opts] = jest.mocked(transporter.sendMail).mock.calls[0]!;
    expect(opts.to).toBe(BASIC_EMAIL);
    const escapedBase = config.CLIENT_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(opts.text).toMatch(new RegExp(`${escapedBase}/reset-password/[a-f0-9]{64}`));
  });

  it('returns the same 200 payload for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: NONEXISTENT_EMAIL });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe(NEUTRAL_MESSAGE);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('creates a password_reset_tokens row with hashed token and ~1h expiry', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: TOKEN_EMAIL });

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: tokenUserId },
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toBeDefined();
    expect(tokens[0].tokenHash.length).toBe(64);

    const expiryDelta = tokens[0].expiresAt.getTime() - Date.now();
    expect(expiryDelta).toBeGreaterThan(55 * 60 * 1000);
    expect(expiryDelta).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
  });

  it('raw token is not stored — stored value is a SHA-256 hex digest', async () => {
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: tokenUserId },
    });

    expect(tokens[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('replaces prior unused token on second request', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: REPLACE_EMAIL });

    const firstTokens = await prisma.passwordResetToken.findMany({
      where: { userId: replaceUserId },
    });
    expect(firstTokens).toHaveLength(1);
    const firstHash = firstTokens[0].tokenHash;

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: REPLACE_EMAIL });

    const secondTokens = await prisma.passwordResetToken.findMany({
      where: { userId: replaceUserId },
    });
    expect(secondTokens).toHaveLength(1);
    expect(secondTokens[0].tokenHash).not.toBe(firstHash);
  });

  it('returns 422 for malformed email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 on the 4th request for the same email', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: RATE_EMAIL });
      expect(res.status).toBe(200);
    }

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: RATE_EMAIL });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('does not create a token row for non-existent email', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: NONEXISTENT_EMAIL });

    const tokensForNonexistent = await prisma.passwordResetToken.findMany({
      where: { user: { email: NONEXISTENT_EMAIL } },
    });
    expect(tokensForNonexistent).toHaveLength(0);
  });
});
