import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { getTodayInTimezone } from '../lib/calendar-date.js';

const TEST_EMAIL = 'habits-delete@habit-habits-test.com';
const OTHER_EMAIL = 'habits-delete-other@habit-habits-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

let testUserId: string;
let otherUserId: string;
let validToken: string;
let otherHabitId: string;

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

  const otherHabit = await prisma.habit.create({
    data: { userId: otherUserId, name: 'Other Habit', startDate: new Date(Date.UTC(2026, 0, 1)) },
  });
  otherHabitId = otherHabit.id;
});

beforeEach(async () => {
  await prisma.dayEntry.deleteMany({ where: { habit: { userId: testUserId } } });
  await prisma.habit.deleteMany({ where: { userId: testUserId } });
});

afterAll(async () => {
  await prisma.dayEntry.deleteMany({
    where: { habit: { user: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } } },
  });
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('DELETE /api/habits/:id', () => {
  it('returns 200 with { deleted: true } and removes the habit', async () => {
    const habit = await prisma.habit.create({
      data: { userId: testUserId, name: 'To Delete', startDate: new Date(Date.UTC(2026, 0, 15)) },
    });

    const res = await request(app)
      .delete(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });

    const getRes = await request(app)
      .get(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(getRes.status).toBe(404);
  });

  it('cascade-deletes associated day_entries', async () => {
    const habit = await prisma.habit.create({
      data: { userId: testUserId, name: 'With Entries', startDate: new Date(Date.UTC(2026, 0, 1)) },
    });

    await prisma.dayEntry.createMany({
      data: [
        { habitId: habit.id, entryDate: new Date(Date.UTC(2026, 0, 1)) },
        { habitId: habit.id, entryDate: new Date(Date.UTC(2026, 0, 2)) },
      ],
    });

    const entriesBefore = await prisma.dayEntry.count({ where: { habitId: habit.id } });
    expect(entriesBefore).toBe(2);

    await request(app)
      .delete(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const entriesAfter = await prisma.dayEntry.count({ where: { habitId: habit.id } });
    expect(entriesAfter).toBe(0);
  });

  it('deletes an active habit', async () => {
    const habit = await prisma.habit.create({
      data: {
        userId: testUserId,
        name: 'Active',
        startDate: new Date(Date.UTC(2026, 0, 1)),
        isArchived: false,
      },
    });

    const res = await request(app)
      .delete(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
  });

  it('deletes an archived habit', async () => {
    const habit = await prisma.habit.create({
      data: {
        userId: testUserId,
        name: 'Archived',
        startDate: new Date(Date.UTC(2026, 0, 1)),
        isArchived: true,
      },
    });

    const res = await request(app)
      .delete(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });

  it("returns 404 for another user's habit", async () => {
    const res = await request(app)
      .delete(`/api/habits/${otherHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent UUID', async () => {
    const res = await request(app)
      .delete('/api/habits/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
  });

  it('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .delete('/api/habits/not-a-uuid')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth', async () => {
    const habit = await prisma.habit.create({
      data: { userId: testUserId, name: 'No Auth', startDate: new Date(Date.UTC(2026, 0, 1)) },
    });

    const res = await request(app).delete(`/api/habits/${habit.id}`).set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('frees an active slot — delete one of 10 then create succeeds', async () => {
    const today = getTodayInTimezone(TZ);

    const habits = [];
    for (let i = 0; i < 10; i++) {
      const h = await prisma.habit.create({
        data: {
          userId: testUserId,
          name: `Active ${i}`,
          startDate: new Date(Date.UTC(2026, 0, 1)),
          isArchived: false,
        },
      });
      habits.push(h);
    }

    const limitRes = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Overflow', startDate: today });

    expect(limitRes.status).toBe(409);

    await request(app)
      .delete(`/api/habits/${habits[0].id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const createRes = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Now Fits', startDate: today });

    expect(createRes.status).toBe(201);
  });
});
