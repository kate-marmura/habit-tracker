import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'register-test@test.com';
const VALID_PASSWORD = 'StrongPass1';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with token and user on success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns a valid JWT with correct sub claim', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jwt-test@test.com', password: VALID_PASSWORD });

    const decoded = jwt.verify(res.body.token, config.JWT_SECRET, { algorithms: ['HS256'] }) as {
      sub: string;
    };
    expect(decoded.sub).toBe(res.body.user.id);
  });

  it('stores hashed password, not plaintext', async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe(VALID_PASSWORD);
    expect(user!.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('returns 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: VALID_PASSWORD });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for password too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short-pw@test.com', password: 'Ab1' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('at least 8 characters');
  });

  it('returns 422 for password missing uppercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-upper@test.com', password: 'lowercase1' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('uppercase');
  });

  it('returns 422 for password missing lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-lower@test.com', password: 'UPPERCASE1' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('lowercase');
  });

  it('returns 422 for password missing number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-num@test.com', password: 'NoNumberHere' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('number');
  });

  it('returns 422 for password exceeding 128 chars', async () => {
    const longPassword = 'A1' + 'a'.repeat(127);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'long-pw@test.com', password: longPassword });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('128');
  });

  it('returns 422 for common password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'common-pw@test.com', password: 'Password1' });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('common');
  });

  it('lowercases and trims email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: '  Trim@TEST.com  ', password: VALID_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('trim@test.com');
  });
});
