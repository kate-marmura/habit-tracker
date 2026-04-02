import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const TEST_EMAIL = 'habits-list@habit-habits-test.com';
const OTHER_EMAIL = 'habits-list-other@habit-habits-test.com';
const TEST_PASSWORD = 'StrongPass1';
const TZ = 'UTC';

let testUserId: string;
let otherUserId: string;
let validToken: string;

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

  const now = new Date();
  await prisma.habit.createMany({
    data: [
      {
        userId: testUserId,
        name: 'Active Older',
        startDate: new Date(Date.UTC(2026, 0, 1)),
        isArchived: false,
        createdAt: new Date(now.getTime() - 3000),
      },
      {
        userId: testUserId,
        name: 'Active Newer',
        startDate: new Date(Date.UTC(2026, 0, 2)),
        isArchived: false,
        createdAt: new Date(now.getTime() - 1000),
      },
      {
        userId: testUserId,
        name: 'Archived Older',
        startDate: new Date(Date.UTC(2026, 0, 3)),
        isArchived: true,
        createdAt: new Date(now.getTime() - 2000),
      },
      {
        userId: testUserId,
        name: 'Archived Newer',
        startDate: new Date(Date.UTC(2026, 0, 4)),
        isArchived: true,
        createdAt: new Date(now.getTime() - 500),
      },
      {
        userId: otherUserId,
        name: 'Other User Active',
        startDate: new Date(Date.UTC(2026, 0, 1)),
        isArchived: false,
      },
      {
        userId: otherUserId,
        name: 'Other User Archived',
        startDate: new Date(Date.UTC(2026, 0, 1)),
        isArchived: true,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { userId: { in: [testUserId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, OTHER_EMAIL] } } });
  await prisma.$disconnect();
});

describe('GET /api/habits (active)', () => {
  it('returns 200 with only active habits for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const names = res.body.map((h: { name: string }) => h.name);
    expect(names).toContain('Active Older');
    expect(names).toContain('Active Newer');
    expect(names).not.toContain('Archived Older');
    expect(names).not.toContain('Archived Newer');
    expect(names).not.toContain('Other User Active');
  });

  it('returns habits ordered by createdAt descending (newest first)', async () => {
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    const names = res.body.map((h: { name: string }) => h.name);
    expect(names.indexOf('Active Newer')).toBeLessThan(names.indexOf('Active Older'));
  });

  it('returns correct field shape', async () => {
    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const habit = res.body[0];
    expect(habit).toHaveProperty('id');
    expect(habit).toHaveProperty('name');
    expect(habit).toHaveProperty('description');
    expect(habit).toHaveProperty('startDate');
    expect(habit).toHaveProperty('isArchived');
    expect(habit).toHaveProperty('createdAt');
    expect(habit).toHaveProperty('updatedAt');
    expect(habit.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(habit.isArchived).toBe(false);
  });

  it('returns 401 without authorization', async () => {
    const res = await request(app).get('/api/habits').set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no active habits', async () => {
    const otherToken = signToken(otherUserId);
    await prisma.habit.updateMany({
      where: { userId: otherUserId, isArchived: false },
      data: { isArchived: true },
    });

    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    await prisma.habit.updateMany({
      where: { userId: otherUserId, name: 'Other User Active' },
      data: { isArchived: false },
    });
  });
});

describe('GET /api/habits/archived', () => {
  it('returns 200 with only archived habits for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/habits/archived')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const names = res.body.map((h: { name: string }) => h.name);
    expect(names).toContain('Archived Older');
    expect(names).toContain('Archived Newer');
    expect(names).not.toContain('Active Older');
    expect(names).not.toContain('Active Newer');
    expect(names).not.toContain('Other User Archived');
  });

  it('returns archived habits ordered by createdAt descending (newest first)', async () => {
    const res = await request(app)
      .get('/api/habits/archived')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    const names = res.body.map((h: { name: string }) => h.name);
    expect(names.indexOf('Archived Newer')).toBeLessThan(names.indexOf('Archived Older'));
  });

  it('returns correct field shape with isArchived true', async () => {
    const res = await request(app)
      .get('/api/habits/archived')
      .set('Authorization', `Bearer ${validToken}`)
      .set('X-Timezone', TZ);

    const habit = res.body[0];
    expect(habit.isArchived).toBe(true);
    expect(habit.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 401 without authorization', async () => {
    const res = await request(app).get('/api/habits/archived').set('X-Timezone', TZ);

    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no archived habits', async () => {
    const otherToken = signToken(otherUserId);
    await prisma.habit.updateMany({
      where: { userId: otherUserId, isArchived: true },
      data: { isArchived: false },
    });

    const res = await request(app)
      .get('/api/habits/archived')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('X-Timezone', TZ);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    await prisma.habit.updateMany({
      where: { userId: otherUserId, name: 'Other User Archived' },
      data: { isArchived: true },
    });
  });
});
