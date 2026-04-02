import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { getTodayInTimezone, parseCalendarDate } from '../lib/calendar-date.js';
import { addCalendarDays } from '../services/stats.service.js';

const TEST_EMAIL = 'stats-api@habit-stats-test.com';
const OTHER_EMAIL = 'stats-api-other@habit-stats-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

let testUserId: string;
let otherUserId: string;
let validToken: string;
let testHabitId: string;
let emptyHabitId: string;
let otherHabitId: string;

let expectedStats: {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalDays: number;
  completedDays: number;
};

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

beforeAll(async () => {
  await prisma.dayEntry.deleteMany({
    where: { habit: { user: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } } },
  });
  await prisma.habit.deleteMany({ where: { user: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await prisma.user.create({ data: { email: TEST_EMAIL, passwordHash } });
  testUserId = user.id;
  validToken = signToken(testUserId);

  const other = await prisma.user.create({ data: { email: OTHER_EMAIL, passwordHash } });
  otherUserId = other.id;

  const today = getTodayInTimezone(TZ);
  const startStr = addCalendarDays(today, -19);
  const isolated = addCalendarDays(today, -10);
  const streak1 = addCalendarDays(today, -2);
  const streak2 = addCalendarDays(today, -1);
  const streak3 = today;

  const habit = await prisma.habit.create({
    data: {
      userId: testUserId,
      name: 'Stats Habit',
      startDate: parseCalendarDate(startStr),
    },
  });
  testHabitId = habit.id;

  const emptyHabit = await prisma.habit.create({
    data: {
      userId: testUserId,
      name: 'Empty Stats Habit',
      startDate: parseCalendarDate(startStr),
    },
  });
  emptyHabitId = emptyHabit.id;

  const otherHabit = await prisma.habit.create({
    data: {
      userId: otherUserId,
      name: 'Other Stats Habit',
      startDate: parseCalendarDate(startStr),
    },
  });
  otherHabitId = otherHabit.id;

  await prisma.dayEntry.createMany({
    data: [
      { habitId: testHabitId, entryDate: parseCalendarDate(isolated) },
      { habitId: testHabitId, entryDate: parseCalendarDate(streak1) },
      { habitId: testHabitId, entryDate: parseCalendarDate(streak2) },
      { habitId: testHabitId, entryDate: parseCalendarDate(streak3) },
    ],
  });

  expectedStats = {
    currentStreak: 3,
    longestStreak: 3,
    completionRate: 4 / 20,
    totalDays: 20,
    completedDays: 4,
  };
});

afterAll(async () => {
  await prisma.dayEntry.deleteMany({
    where: { habitId: { in: [testHabitId, otherHabitId, emptyHabitId] } },
  });
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('GET /api/habits/:id/stats', () => {
  it('returns 200 with expected stats shape and values', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/stats`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expectedStats);
  });

  it('returns zeros for habit with no day entries', async () => {
    const res = await request(app)
      .get(`/api/habits/${emptyHabitId}/stats`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      totalDays: 20,
      completedDays: 0,
    });
  });

  it('returns 401 without Authorization', async () => {
    const res = await request(app).get(`/api/habits/${testHabitId}/stats`).set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('returns 404 for another user habit', async () => {
    const res = await request(app)
      .get(`/api/habits/${otherHabitId}/stats`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent habit id', async () => {
    const res = await request(app)
      .get('/api/habits/00000000-0000-4000-8000-000000000099/stats')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
  });

  it('accepts X-Timezone and returns 200', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}/stats`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', 'America/New_York');

    expect(res.status).toBe(200);
    expect(typeof res.body.currentStreak).toBe('number');
    expect(typeof res.body.completionRate).toBe('number');
  });
});
