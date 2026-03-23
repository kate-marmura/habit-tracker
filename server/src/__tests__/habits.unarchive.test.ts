import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'habits-unarchive@habit-habits-test.com';
const OTHER_EMAIL = 'habits-unarchive-other@habit-habits-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

let testUserId: string;
let otherUserId: string;
let validToken: string;
let archivedHabitId: string;
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
    data: {
      userId: testUserId,
      name: 'Archived Habit',
      description: 'Was archived',
      startDate: new Date(Date.UTC(2026, 0, 15)),
      isArchived: true,
    },
  });
  archivedHabitId = habit.id;
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('PATCH /api/habits/:id/unarchive', () => {
  it('returns 200 and sets isArchived to false', async () => {
    const res = await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(archivedHabitId);
    expect(res.body.isArchived).toBe(false);
    expect(res.body.name).toBe('Archived Habit');
    expect(res.body.description).toBe('Was archived');
    expect(res.body.startDate).toBe('2026-01-15');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('is idempotent — unarchiving an already active habit returns 200', async () => {
    await prisma.habit.update({
      where: { id: archivedHabitId },
      data: { isArchived: false },
    });

    const res = await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(false);
  });

  it('habit appears in active list and disappears from archived after unarchive', async () => {
    await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const active = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const archived = await request(app)
      .get('/api/habits/archived')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(active.body.some((h: { id: string }) => h.id === archivedHabitId)).toBe(true);
    expect(archived.body.some((h: { id: string }) => h.id === archivedHabitId)).toBe(false);
  });

  it('returns 404 for another user\'s habit', async () => {
    const res = await request(app)
      .patch(`/api/habits/${otherHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent UUID', async () => {
    const res = await request(app)
      .patch('/api/habits/00000000-0000-0000-0000-000000000000/unarchive')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .patch('/api/habits/not-a-uuid/unarchive')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('returns 409 HABIT_LIMIT_REACHED when user already has 10 active habits', async () => {
    for (let i = 0; i < 10; i++) {
      await prisma.habit.create({
        data: {
          userId: testUserId,
          name: `Active ${i}`,
          startDate: new Date(Date.UTC(2026, 0, 1)),
          isArchived: false,
        },
      });
    }

    const res = await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HABIT_LIMIT_REACHED');
    expect(res.body.error.message).toBe('You can have up to 10 active habits.');
  });

  it('succeeds after archiving one active habit to free a slot', async () => {
    const activeHabits = [];
    for (let i = 0; i < 10; i++) {
      const h = await prisma.habit.create({
        data: {
          userId: testUserId,
          name: `Active ${i}`,
          startDate: new Date(Date.UTC(2026, 0, 1)),
          isArchived: false,
        },
      });
      activeHabits.push(h);
    }

    const limitRes = await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);
    expect(limitRes.status).toBe(409);

    await request(app)
      .patch(`/api/habits/${activeHabits[0].id}/archive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const res = await request(app)
      .patch(`/api/habits/${archivedHabitId}/unarchive`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(false);
  });
});
