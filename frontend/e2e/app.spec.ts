import { test, expect } from '@playwright/test';

test.describe('eval-kanban', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Application Load', () => {
    test('should display the kanban board with 4 columns', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'eval-kanban' })).toBeVisible();

      await expect(page.getByText('To Do')).toBeVisible();
      await expect(page.getByText('In Progress')).toBeVisible();
      await expect(page.getByText('Review')).toBeVisible();
      await expect(page.getByText('Done')).toBeVisible();
    });

    test('should show connection status indicator', async ({ page }) => {
      const indicator = page.locator('span[title="Connected"], span[title="Disconnected"]');
      await expect(indicator).toBeVisible();
    });

    test('should have New Task button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /New Task/i })).toBeVisible();
    });
  });

  test.describe('Task Creation', () => {
    test('should open create task modal when clicking New Task', async ({ page }) => {
      await page.getByRole('button', { name: /New Task/i }).click();

      await expect(page.getByRole('heading', { name: 'New Task' })).toBeVisible();
      await expect(page.getByPlaceholder('Task title...')).toBeVisible();
      await expect(page.getByPlaceholder('Describe the task for Claude...')).toBeVisible();
    });

    test('should close modal when clicking Cancel', async ({ page }) => {
      await page.getByRole('button', { name: /New Task/i }).click();
      await expect(page.getByRole('heading', { name: 'New Task' })).toBeVisible();

      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'New Task' })).not.toBeVisible();
    });

    test('should show validation error for empty title', async ({ page }) => {
      await page.getByRole('button', { name: /New Task/i }).click();

      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('should create a task and display it in To Do column', async ({ page }) => {
      const taskTitle = `Test Task ${Date.now()}`;

      await page.getByRole('button', { name: /New Task/i }).click();
      await page.getByPlaceholder('Task title...').fill(taskTitle);
      await page.getByPlaceholder('Describe the task for Claude...').fill('Test description');
      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByRole('heading', { name: 'New Task' })).not.toBeVisible();
      await expect(page.getByText(taskTitle)).toBeVisible();
    });
  });

  test.describe('Task Deletion', () => {
    test('should delete a task when confirmed', async ({ page }) => {
      const taskTitle = `Delete Test ${Date.now()}`;

      await page.getByRole('button', { name: /New Task/i }).click();
      await page.getByPlaceholder('Task title...').fill(taskTitle);
      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByText(taskTitle)).toBeVisible();

      page.on('dialog', (dialog) => dialog.accept());

      // Find the task card by its title h3, go up to the task card div, and click Delete
      const taskCard = page.locator('h3', { hasText: taskTitle }).locator('..').locator('..');
      await taskCard.getByRole('button', { name: 'Delete' }).click();

      await expect(page.getByText(taskTitle)).not.toBeVisible();
    });
  });

  test.describe('Task Interaction', () => {
    test('should show Start button for tasks in To Do', async ({ page }) => {
      const taskTitle = `Start Test ${Date.now()}`;

      await page.getByRole('button', { name: /New Task/i }).click();
      await page.getByPlaceholder('Task title...').fill(taskTitle);
      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByText(taskTitle)).toBeVisible();

      // Find the task card by its title h3 and check for Start button
      const taskCard = page.locator('h3', { hasText: taskTitle }).locator('..').locator('..');
      await expect(taskCard.getByRole('button', { name: 'Start' })).toBeVisible();
    });
  });
});
