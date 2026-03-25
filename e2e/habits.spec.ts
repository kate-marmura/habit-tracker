import { test, expect } from '@playwright/test';
import {
  registerUser,
  loginUser,
  createHabitViaUI,
  uniqueHabitName,
  todayLabel,
} from './helpers';

test.describe('Habit lifecycle', () => {
  let userEmail: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const { email } = await registerUser(page);
    userEmail = email;
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, userEmail);
  });

  test('create a habit and verify it appears in the active list', async ({ page }) => {
    const name = uniqueHabitName();
    await createHabitViaUI(page, name);

    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Navigate to calendar and verify it opens
    await page.getByText(name, { exact: true }).first().click();
    await expect(page.getByRole('grid')).toBeVisible();
    await expect(page.getByLabel('Habit statistics')).toBeVisible();
  });

  test('mark today on the calendar and verify state changes', async ({ page }) => {
    const name = uniqueHabitName();
    await createHabitViaUI(page, name);

    await page.getByText(name, { exact: true }).first().click();
    await expect(page.getByRole('grid')).toBeVisible();

    const { monthName, day } = todayLabel();
    const todayCell = page.getByRole('gridcell', {
      name: `${monthName} ${day} (today)`,
    });
    await todayCell.click();

    await expect(
      page.getByRole('gridcell', {
        name: `${monthName} ${day} (today) (marked)`,
      }),
    ).toBeVisible();

    await expect(page.getByLabel('Habit statistics')).toBeVisible();
  });

  test('unmark a day and verify undo toast appears', async ({ page }) => {
    const name = uniqueHabitName();
    await createHabitViaUI(page, name);

    await page.getByText(name, { exact: true }).first().click();
    await expect(page.getByRole('grid')).toBeVisible();

    const { monthName, day } = todayLabel();

    // Mark today
    await page
      .getByRole('gridcell', { name: `${monthName} ${day} (today)` })
      .click();
    await expect(
      page.getByRole('gridcell', {
        name: `${monthName} ${day} (today) (marked)`,
      }),
    ).toBeVisible();

    // Unmark today
    await page
      .getByRole('gridcell', {
        name: `${monthName} ${day} (today) (marked)`,
      })
      .click();

    await expect(page.getByText('Day unmarked')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });

  test('archive a habit and restore it from archived list', async ({ page }) => {
    const name = uniqueHabitName();
    await createHabitViaUI(page, name);

    // Archive via card action button + confirm modal
    await page.getByLabel(`Archive ${name}`).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Archive' })
      .click();

    // Habit removed from active list
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();

    // Navigate to archived page and verify presence
    await page.getByLabel('Archived').click();
    await expect(page.getByText('Archived Habits')).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Unarchive the habit
    await page.getByLabel(`Unarchive ${name}`).click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();

    // Return to active list and verify habit is restored
    await page.getByLabel('Back to habits').click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test('permanently delete a habit with typed-name confirmation', async ({
    page,
  }) => {
    const name = uniqueHabitName();
    await createHabitViaUI(page, name);

    // Open delete modal
    await page.getByLabel(`Delete ${name}`).click();
    await expect(
      page.getByText(`Permanently delete '${name}'?`),
    ).toBeVisible();

    // Type name and confirm
    await page.locator('#delete-confirm-name').fill(name);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete' })
      .click();

    // Habit removed from list
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});
