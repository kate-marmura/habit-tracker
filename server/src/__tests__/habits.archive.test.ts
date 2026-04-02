import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { getTodayInTimezone } from '../lib/calendar-date.js';

const TEST_EMAIL = 'habits-archive@habit-habits-test.com';
const OTHER_EMAIL = 'habits-archive-other@habit-habits-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

let testUserId: string;
let otherUserId: string;
let validToken: string;
let activeHabitId: string;
let otherHabitId: string;

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

beforeAll(async () => {
  await prisma.habit.deleteMany({ where: { user: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await prisma.user.create({ data: { email: TEST_EMAIL, passwordHash } });
  testUserId = user.id;
  validToken = signToken(testUserId);

  const other = await prisma.user.create({ data: { email: OTHER_EMAIL, passwordHash } });
  otherUserId = other.id;

  const otherHabit = await prisma.habit.create({
    data: { userId: otherUserId, name: 'Other Habit', startDate: new Date(Date.UTC(2026, 0, 1)) },
  });
  otherHabitId = otherHabit.id;
});

beforeEach(async () => {
  await prisma.habit.deleteMany({ where: { userId: testUserId } });

  const habit = await prisma.habit.create({
    data: { userId: testUserId, name: 'Active Habit', startDate: new Date(Date.UTC(2026, 0, 15)) },
  });
  activeHabitId = habit.id;
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('PATCH /api/habits/:id/archive', () => {
  it('archives a habit and returns 200 with isArchived true', async () => {
    const res = await request(app)
      .patch(`/api/habits/${activeHabitId}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(activeHabitId);
    expect(res.body.isArchived).toBe(true);
    expect(res.body.name).toBe('Active Habit');
    expect(res.body.startDate).toBe('2026-01-15');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('is idempotent — second PATCH returns 200 still archived', async () => {
    await request(app)
      .patch(`/api/habits/${activeHabitId}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const res = await request(app)
      .patch(`/api/habits/${activeHabitId}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(true);
  });

  it('archived habit disappears from active list and appears in archived list', async () => {
    await request(app)
      .patch(`/api/habits/${activeHabitId}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const activeRes = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const activeIds = activeRes.body.map((h: { id: string }) => h.id);
    expect(activeIds).not.toContain(activeHabitId);

    const archivedRes = await request(app)
      .get('/api/habits/archived')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const archivedIds = archivedRes.body.map((h: { id: string }) => h.id);
    expect(archivedIds).toContain(activeHabitId);
  });

  it("returns 404 for another user's habit", async () => {
    const res = await request(app)
      .patch(`/api/habits/${otherHabitId}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent UUID', async () => {
    const res = await request(app)
      .patch('/api/habits/00000000-0000-0000-0000-000000000000/archive')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .patch('/api/habits/not-a-uuid/archive')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch(`/api/habits/${activeHabitId}/archive`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('frees active slot — user at limit can create after archiving', async () => {
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

    const limitRes = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Overflow', startDate: today });

    expect(limitRes.status).toBe(409);
    expect(limitRes.body.error.code).toBe('HABIT_LIMIT_REACHED');

    const firstHabit = await prisma.habit.findFirst({
      where: { userId: testUserId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    await request(app)
      .patch(`/api/habits/${firstHabit!.id}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const createRes = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'After Archive', startDate: today });

    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('After Archive');
  });
});
