import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'entries-delete@habit-entries-test.com';
const OTHER_EMAIL = 'entries-delete-other@habit-entries-test.com';
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
      name: 'Delete Test Habit',
      startDate: new Date(Date.UTC(2026, 2, 1)),
    },
  });
  testHabitId = habit.id;

  const otherHabit = await prisma.habit.create({
    data: {
      userId: otherUserId,
      name: 'Other Delete Habit',
      startDate: new Date(Date.UTC(2026, 2, 1)),
    },
  });
  otherHabitId = otherHabit.id;

  await prisma.dayEntry.create({
    data: { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 2, 10)) },
  });
});

afterAll(async () => {
  await prisma.dayEntry.deleteMany({ where: { habitId: { in: [testHabitId, otherHabitId] } } });
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('DELETE /api/habits/:id/entries/:date', () => {
  it('returns 204 and deletes an existing entry', async () => {
    const res = await request(app)
      .delete(`/api/habits/${testHabitId}/entries/2026-03-10`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(204);

    const remaining = await prisma.dayEntry.findMany({
      where: { habitId: testHabitId, entryDate: new Date(Date.UTC(2026, 2, 10)) },
    });
    expect(remaining).toHaveLength(0);
  });

  it('returns 204 idempotently for a non-existent entry on an owned habit', async () => {
    const res = await request(app)
      .delete(`/api/habits/${testHabitId}/entries/2026-03-20`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(204);
  });

  it('returns 404 for habit belonging to another user', async () => {
    const res = await request(app)
      .delete(`/api/habits/${otherHabitId}/entries/2026-03-10`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 without authorization', async () => {
    const res = await request(app)
      .delete(`/api/habits/${testHabitId}/entries/2026-03-10`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid date format', async () => {
    const res = await request(app)
      .delete(`/api/habits/${testHabitId}/entries/not-a-date`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
  });

  it('returns 422 for impossible date 2026-13-01', async () => {
    const res = await request(app)
      .delete(`/api/habits/${testHabitId}/entries/2026-13-01`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
  });
});
