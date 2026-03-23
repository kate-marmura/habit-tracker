import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'entries-list@habit-entries-test.com';
const OTHER_EMAIL = 'entries-list-other@habit-entries-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

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
      name: 'Test Habit',
      startDate: new Date(Date.UTC(2026, 0, 1)),
    },
  });
  testHabitId = habit.id;

  const otherHabit = await prisma.habit.create({
    data: {
      userId: otherUserId,
      name: 'Other Habit',
      startDate: new Date(Date.UTC(2026, 0, 1)),
    },
  });
  otherHabitId = otherHabit.id;

  await prisma.dayEntry.createMany({
    data: [
      { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 2, 1)) },
      { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 2, 5)) },
      { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 2, 15)) },
      { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 2, 31)) },
      // Entry in a different month (February)
      { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 1, 28)) },
      // Entry in April
      { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 3, 1)) },
    ],
  });
});

afterAll(async () => {
  await prisma.dayEntry.deleteMany({ where: { habitId: { in: [testHabitId, otherHabitId] } } });
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('GET /api/habits/:id/entries', () => {
  it('returns 200 with correct entries for March 2026', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2026-03`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);

    const dates = res.body.map((e: { entryDate: string }) => e.entryDate);
    expect(dates).toEqual(['2026-03-01', '2026-03-05', '2026-03-15', '2026-03-31']);
  });

  it('returns empty array for a month with no entries', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2025-12`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('does not return entries from other months (boundary check)', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2026-03`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    const dates = res.body.map((e: { entryDate: string }) => e.entryDate);
    expect(dates).not.toContain('2026-02-28');
    expect(dates).not.toContain('2026-04-01');
  });

  it('returns correct response shape — each entry has id (UUID) and entryDate (YYYY-MM-DD)', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2026-03`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    for (const entry of res.body) {
      expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(entry.entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Object.keys(entry).sort()).toEqual(['entryDate', 'id']);
    }
  });

  it('returns 404 for habit belonging to another user', async () => {
    const res = await request(app)
      .get(`/api/habits/${otherHabitId}/entries?month=2026-03`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 without authorization', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2026-03`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid month format', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2026-3`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
  });

  it('returns 422 for month=2026-13 (invalid month number)', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries?month=2026-13`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
  });

  it('returns 422 for missing month query param', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/entries`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
  });
});
