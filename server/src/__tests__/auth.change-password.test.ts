import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'changepw@habit-changepw-test.com';
const ORIGINAL_PASSWORD = 'OriginalPass1';
const NEW_PASSWORD = 'NewSecurePass2';

let testUserId: string;
let validToken: string;

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  const passwordHash = await bcrypt.hash(ORIGINAL_PASSWORD, 12);
  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, passwordHash },
  });
  testUserId = user.id;
  validToken = signToken(testUserId);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('PUT /api/auth/change-password', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(ORIGINAL_PASSWORD, 12);
    await prisma.user.update({
      where: { id: testUserId },
      data: { passwordHash },
    });
  });

  it('returns 200 and changes password with valid credentials', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Password changed successfully');

    const updated = await prisma.user.findUnique({ where: { id: testUserId } });
    const newHashMatches = await bcrypt.compare(NEW_PASSWORD, updated!.passwordHash);
    expect(newHashMatches).toBe(true);
  });

  it('returns 401 for wrong current password', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'WrongCurrent1', newPassword: 'AnotherPass3' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ currentPassword: NEW_PASSWORD, newPassword: 'SomethingElse4' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for invalid/expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: testUserId, exp: Math.floor(Date.now() / 1000) - 60 },
      config.JWT_SECRET,
      { algorithm: 'HS256' },
    );

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({ currentPassword: NEW_PASSWORD, newPassword: 'SomethingElse4' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 422 for weak new password', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when new password is same as current', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: ORIGINAL_PASSWORD });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PASSWORD_UNCHANGED');
  });

  it('after change, old password fails login and new password succeeds', async () => {
    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: ORIGINAL_PASSWORD, newPassword: NEW_PASSWORD });

    expect(changeRes.status).toBe(200);

    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: ORIGINAL_PASSWORD });

    expect(loginOld.status).toBe(401);

    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: NEW_PASSWORD });

    expect(loginNew.status).toBe(200);
    expect(loginNew.body.token).toBeDefined();
  });
});
