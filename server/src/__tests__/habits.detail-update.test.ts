import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'habits-detail@habit-habits-test.com';
const OTHER_EMAIL = 'habits-detail-other@habit-habits-test.com';
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
      description: 'Original description',
      startDate: new Date(Date.UTC(2026, 0, 15)),
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
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('GET /api/habits/:id', () => {
  it('returns 200 with habit for the owner', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testHabitId);
    expect(res.body.name).toBe('Test Habit');
    expect(res.body.description).toBe('Original description');
    expect(res.body.startDate).toBe('2026-01-15');
    expect(res.body.isArchived).toBe(false);
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('returns 404 for another user\'s habit', async () => {
    const res = await request(app)
      .get(`/api/habits/${otherHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent UUID', async () => {
    const res = await request(app)
      .get('/api/habits/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .get('/api/habits/not-a-uuid')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .get(`/api/habits/${testHabitId}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/habits/:id', () => {
  it('updates name and description and returns 200', async () => {
    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Updated Habit', description: 'New description' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testHabitId);
    expect(res.body.name).toBe('Updated Habit');
    expect(res.body.description).toBe('New description');
    expect(res.body.startDate).toBe('2026-01-15');
    expect(res.body.isArchived).toBe(false);
  });

  it('clears description when sent as empty string', async () => {
    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Updated Habit', description: '' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
  });

  it('clears description when omitted', async () => {
    await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'With Desc', description: 'temp' });

    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'No Desc' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
  });

  it('does not change startDate or isArchived', async () => {
    const before = await request(app)
      .get(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Immutable Check' });

    expect(res.status).toBe(200);
    expect(res.body.startDate).toBe(before.body.startDate);
    expect(res.body.isArchived).toBe(before.body.isArchived);
  });

  it('updates updatedAt timestamp', async () => {
    const before = await request(app)
      .get(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Timestamp Check' });

    expect(res.status).toBe(200);
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(before.body.updatedAt).getTime(),
    );
  });

  it('returns 404 for another user\'s habit', async () => {
    const res = await request(app)
      .put(`/api/habits/${otherHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Stolen' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent UUID', async () => {
    const res = await request(app)
      .put('/api/habits/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 for empty name', async () => {
    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: '' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for name exceeding 100 characters', async () => {
    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'a'.repeat(101) });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .put('/api/habits/not-a-uuid')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ)
      .send({ name: 'Test' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .put(`/api/habits/${testHabitId}`)
      .set('X-Timezone', TZ)
      .send({ name: 'No Auth' });

    expect(res.status).toBe(401);
  });
});
