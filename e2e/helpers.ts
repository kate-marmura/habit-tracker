import type { Page } from '@playwright/test';

let counter = 0;

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${++counter}@test.example`;
}

export function uniqueHabitName(): string {
  return `Habit ${Date.now()}-${++counter}`;
}

export const TEST_PASSWORD = 'TestPass1';

export async function registerUser(page: Page): Promise<{ email: string; password: string }> {
  const email = uniqueEmail();
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/habits');
  return { email, password: TEST_PASSWORD };
}

export async function loginUser(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/habits');
}

export async function logoutUser(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/login');
}

export async function createHabitViaUI(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: '+ New habit' }).click();
  await page.locator('#habit-name').fill(name);
  await page.getByRole('button', { name: 'Create habit' }).click();
  await page.getByText(name, { exact: true }).waitFor();
}

export function todayLabel(): { monthName: string; day: number } {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  return { monthName, day: now.getDate() };
}
