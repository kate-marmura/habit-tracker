import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { getTodayInTimezone } from '../lib/calendar-date.js';

const TEST_EMAIL = 'habits-create@habit-habits-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

let testUserId: string;
let validToken: string;

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

beforeAll(async () => {
  await prisma.habit.deleteMany({ where: { user: { email: TEST_EMAIL } } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, passwordHash },
  });
  testUserId = user.id;
  validToken = signToken(testUserId);
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

function postHabit(body: Record<string, unknown>, token?: string) {
  const req = request(app)
    .post('/api/habits')
    .set('X-Timezone', TZ);
  if (token !== undefined) {
    req.set('Authorization', `Bearer ${token}`);
  }
  return req.send(body);
}

describe('POST /api/habits', () => {
  it('creates a habit and returns 201 with correct shape', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit(
      { name: 'Exercise', description: 'Daily workout', startDate: today },
      validToken,
    );

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Exercise');
    expect(res.body.description).toBe('Daily workout');
    expect(res.body.startDate).toBe(today);
    expect(res.body.isArchived).toBe(false);
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('stores correct calendar date in DB', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit(
      { name: 'Read', startDate: today },
      validToken,
    );

    const dbHabit = await prisma.habit.findUnique({
      where: { id: res.body.id },
    });

    const storedDate = dbHabit!.startDate.toISOString().slice(0, 10);
    expect(storedDate).toBe(today);
  });

  it('returns 422 for future startDate', async () => {
    const res = await postHabit(
      { name: 'Future habit', startDate: '2099-12-31' },
      validToken,
    );

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_START_DATE');
  });

  it('returns 422 for impossible calendar startDate (Zod)', async () => {
    const res = await postHabit(
      { name: 'Bad date habit', startDate: '2026-02-30' },
      validToken,
    );

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for missing name', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit(
      { name: '', startDate: today },
      validToken,
    );

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for name exceeding 100 characters', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit(
      { name: 'a'.repeat(101), startDate: today },
      validToken,
    );

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 HABIT_LIMIT_REACHED for 11th active habit', async () => {
    await prisma.habit.deleteMany({ where: { userId: testUserId } });

    const today = getTodayInTimezone(TZ);
    for (let i = 0; i < 10; i++) {
      await prisma.habit.create({
        data: {
          userId: testUserId,
          name: `Habit ${i}`,
          startDate: new Date(Date.UTC(2026, 0, 1)),
        },
      });
    }

    const res = await postHabit(
      { name: 'Overflow habit', startDate: today },
      validToken,
    );

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HABIT_LIMIT_REACHED');

    await prisma.habit.deleteMany({ where: { userId: testUserId } });
  });

  it('returns 401 without auth token', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit({ name: 'No auth', startDate: today });

    expect(res.status).toBe(401);
  });

  it('stores null description when omitted', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit(
      { name: 'No desc', startDate: today },
      validToken,
    );

    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
  });

  it('stores provided description', async () => {
    const today = getTodayInTimezone(TZ);
    const res = await postHabit(
      { name: 'With desc', description: 'My notes', startDate: today },
      validToken,
    );

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('My notes');
  });
});
