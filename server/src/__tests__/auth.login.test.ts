import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'login@habit-login-test.com';
const TEST_PASSWORD = 'StrongPass1';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  await prisma.user.create({
    data: { email: TEST_EMAIL, passwordHash },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('returns 200 with token and user on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it('returns a valid JWT with correct sub claim', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const decoded = jwt.verify(res.body.token, config.JWT_SECRET, { algorithms: ['HS256'] }) as {
      sub: string;
    };
    expect(decoded.sub).toBe(res.body.user.id);
  });

  it('returns 401 with generic message for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 401 with same generic message for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@habit-login-test.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: TEST_PASSWORD });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not return passwordHash in response', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});
