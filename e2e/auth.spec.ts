import { test, expect } from '@playwright/test';
import { registerUser, logoutUser } from './helpers';

test.describe('Authentication flows', () => {
  test('redirects unauthenticated user from /habits to /login', async ({ page }) => {
    await page.goto('/habits');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('register a new user and land on /habits', async ({ page }) => {
    await registerUser(page);
    await expect(page).toHaveURL(/\/habits/);
    await expect(page.getByText('Your Habits')).toBeVisible();
  });

  test('logout returns to /login and blocks protected route access', async ({ page }) => {
    await registerUser(page);
    await logoutUser(page);
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/habits');
    await expect(page).toHaveURL(/\/login/);
  });
});
