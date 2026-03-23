import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { RESET_PASSWORD_RATE_TEST_SLOT_HEADER } from '../middleware/rate-limit.middleware.js';

const TEST_EMAIL = 'reset@habbit-reset-test.com';
const SIBLING_EMAIL = 'reset-sibling@habbit-reset-test.com';
const TEST_PASSWORD = 'OldPass1234';
const NEW_PASSWORD = 'NewSecure1';
const ALL_EMAILS = [TEST_EMAIL, SIBLING_EMAIL];

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function makeRawToken(): string {
  return randomBytes(32).toString('hex');
}

let testUserId: string;
let siblingUserId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const user = await prisma.user.create({ data: { email: TEST_EMAIL, passwordHash } });
  testUserId = user.id;
  const siblingUser = await prisma.user.create({ data: { email: SIBLING_EMAIL, passwordHash } });
  siblingUserId = siblingUser.id;
});

afterAll(async () => {
  await prisma.passwordResetToken.deleteMany({ where: { user: { email: { in: ALL_EMAILS } } } });
  await prisma.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
  await prisma.$disconnect();
});

async function seedToken(
  userId: string,
  opts?: { expired?: boolean; used?: boolean },
): Promise<string> {
  const raw = makeRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = opts?.expired
    ? new Date(Date.now() - 60 * 1000)
    : new Date(Date.now() + 60 * 60 * 1000);
  const usedAt = opts?.used ? new Date() : null;

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt, usedAt },
  });

  return raw;
}

describe('POST /api/auth/reset-password', () => {
  it('returns 200 with valid token and valid new password', async () => {
    const raw = await seedToken(testUserId);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password has been reset successfully');
  });

  it('hashes token before lookup — raw token is never stored', async () => {
    const raw = await seedToken(testUserId);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: testUserId },
    });

    const rawExists = tokens.some((t) => t.tokenHash === raw);
    expect(rawExists).toBe(false);

    const hashExists = tokens.some((t) => t.tokenHash === hashToken(raw));
    expect(hashExists).toBe(true);
  });

  it('returns 400 for expired token', async () => {
    const raw = await seedToken(testUserId, { expired: true });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('returns 400 for already-used token', async () => {
    const raw = await seedToken(testUserId, { used: true });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('returns 400 for unknown token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: makeRawToken(), newPassword: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('returns 422 for weak newPassword', async () => {
    const raw = await seedToken(testUserId);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('marks usedAt on successful reset', async () => {
    const raw = await seedToken(testUserId);
    const tokenHash = hashToken(raw);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: NEW_PASSWORD });

    const row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
    });

    expect(row?.usedAt).not.toBeNull();
  });

  it('invalidates sibling unused tokens for the same user on success', async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: siblingUserId } });

    await seedToken(siblingUserId);
    await seedToken(siblingUserId);
    const activeRaw = await seedToken(siblingUserId);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: activeRaw, newPassword: NEW_PASSWORD });

    const remaining = await prisma.passwordResetToken.findMany({
      where: { userId: siblingUserId, usedAt: null },
    });

    expect(remaining).toHaveLength(0);
  });

  it('old password fails login after successful reset', async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    const raw = await seedToken(testUserId);
    const resetNewPassword = 'ResetNew1234';

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: resetNewPassword });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(loginRes.status).toBe(401);
  });

  it('new password succeeds login after successful reset', async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    const raw = await seedToken(testUserId);
    const resetNewPassword = 'LoginNew1234';

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: resetNewPassword });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: resetNewPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it('same token cannot be reused after first successful reset', async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    const raw = await seedToken(testUserId);

    const first = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: 'FirstReset1' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, newPassword: 'SecondReset1' });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('returns 429 on the 6th reset attempt within the window (rate limit)', async () => {
    const body = { token: makeRawToken(), newPassword: NEW_PASSWORD };

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .set(RESET_PASSWORD_RATE_TEST_SLOT_HEADER, 'rate-429')
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
    }

    const res = await request(app)
      .post('/api/auth/reset-password')
      .set(RESET_PASSWORD_RATE_TEST_SLOT_HEADER, 'rate-429')
      .send(body);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    const retryAfter = res.headers['retry-after'];
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});
