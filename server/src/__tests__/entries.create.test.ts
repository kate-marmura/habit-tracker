import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'entries-create@habit-entries-test.com';
const OTHER_EMAIL = 'entries-create-other@habit-entries-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'America/New_York';

let testUserId: string;
let otherUserId: string;
let validToken: string;
let testHabitId: string;
let otherHabitId: string;

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

beforeAll(async () => {
  await prisma.dayEntry.deleteMany({ where: { habit: { user: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } } } });
  await prisma.habit.deleteMany({ where: { user: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await prisma.user.create({ data: { email: TEST_EMAIL, passwordHash } });
  testUserId = user.id;
  validToken = signToken(testUserId);

  const other = await prisma.user.create({ data: { email: OTHER_EMAIL, passwordHash } });
  otherUserId = other.id;

  const habit = await prisma.habit.create({
    data: {
      userId: testUserId,
      name: 'Mark Test Habit',
      startDate: new Date(Date.UTC(2026, 2, 1)),
    },
  });
  testHabitId = habit.id;

  const otherHabit = await prisma.habit.create({
    data: {
      userId: otherUserId,
      name: 'Other Mark Habit',
      startDate: new Date(Date.UTC(2026, 2, 1)),
    },
  });
  otherHabitId = otherHabit.id;
});

afterAll(async () => {
  await prisma.dayEntry.deleteMany({ where: { habitId: { in: [testHabitId, otherHabitId] } } });
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('POST /api/habits/:id/entries', () => {
  it('returns 201 and creates entry for a valid date', async () => {
    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-03-10' });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.entryDate).toBe('2026-03-10');
    expect(Object.keys(res.body).sort()).toEqual(['entryDate', 'id']);
  });

  it('returns 422 for date before habit start_date', async () => {
    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-02-28' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_DATE');
    expect(res.body.error.message).toContain('before');
  });

  it('returns 422 for future date', async () => {
    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2099-12-31' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_DATE');
    expect(res.body.error.message).toContain('future');
  });

  it('returns 409 when marking the same date twice', async () => {
    await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-03-05' });

    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-03-05' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MARKED');
  });

  it('returns 404 for habit belonging to another user', async () => {
    const res = await request(app)
      .post(`/api/habits/${otherHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-03-10' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 without authorization', async () => {
    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-03-10' });

    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid date format', async () => {
    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: 'not-a-date' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for impossible date 2026-13-01', async () => {
    const res = await request(app)
      .post(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ date: '2026-13-01' });

    expect(res.status).toBe(422);
  });
});
