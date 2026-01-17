import { test, expect } from '@playwright/test';

test.describe('eval-kanban', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Application Load', () => {
    test('should display the kanban board with 4 columns', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'eval-kanban' })).toBeVisible();

      await expect(page.getByRole('heading', { name: 'To Do' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
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

// Review UI tests - separate describe to avoid beforeEach navigation
test.describe('eval-kanban Review UI', () => {
  // Mock task in review status (id must be valid UUID for Zod validation)
  const mockReviewTask = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Review Test Task',
    description: 'Task for testing review UI',
    status: 'review',
    error_message: null,
    branch_name: 'ek/review-test-task',
    worktree_path: 'C:\\test\\worktree',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockDiffResponse = {
    files: [
      {
        path: 'src/main.rs',
        change_type: 'modified',
        additions: 10,
        deletions: 3,
        content: '@@ -1,3 +1,10 @@\n fn main() {\n+    println!("Hello");\n     println!("World");\n }',
      },
      {
        path: 'README.md',
        change_type: 'added',
        additions: 5,
        deletions: 0,
        content: '@@ -0,0 +1,5 @@\n+# Project\n+\n+Description here.',
      },
    ],
    total_additions: 15,
    total_deletions: 3,
  };

  test('should show Review button only for tasks in review status', async ({ page }) => {
    // Mock the tasks API to return a task in review status
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Find the task card
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');

    // Review button should be visible
    await expect(taskCard.getByRole('button', { name: 'Review' })).toBeVisible();

    // Start button should NOT be visible (only for todo tasks)
    await expect(taskCard.getByRole('button', { name: 'Start' })).not.toBeVisible();
  });

  test('should open ReviewPanel when clicking Review button', async ({ page }) => {
    // Mock tasks API
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock diff API
    await page.route('**/api/tasks/*/diff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDiffResponse),
      });
    });

    await page.goto('/');

    // Click Review button
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');
    await taskCard.getByRole('button', { name: 'Review' }).click();

    // ReviewPanel should open with task title
    await expect(page.getByText(`Review: ${mockReviewTask.title}`)).toBeVisible();

    // Branch name should be shown in ReviewPanel header
    await expect(page.locator('.bg-gray-800').getByText(mockReviewTask.branch_name!)).toBeVisible();

    // Tabs should be visible
    await expect(page.getByRole('button', { name: 'Diff' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
  });

  test('should show diff files in DiffViewer', async ({ page }) => {
    // Mock tasks API
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock diff API
    await page.route('**/api/tasks/*/diff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDiffResponse),
      });
    });

    await page.goto('/');

    // Open ReviewPanel
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');
    await taskCard.getByRole('button', { name: 'Review' }).click();

    // Should show file count and stats
    await expect(page.getByText('2 files changed')).toBeVisible();
    await expect(page.getByText('+15').first()).toBeVisible();
    await expect(page.getByText('-3').first()).toBeVisible();

    // Should show file paths
    await expect(page.getByText('src/main.rs')).toBeVisible();
    await expect(page.getByText('README.md')).toBeVisible();
  });

  test('should expand file diff when clicking on file', async ({ page }) => {
    // Mock tasks API
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock diff API
    await page.route('**/api/tasks/*/diff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDiffResponse),
      });
    });

    await page.goto('/');

    // Open ReviewPanel
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');
    await taskCard.getByRole('button', { name: 'Review' }).click();

    // Click on file to expand
    await page.getByText('src/main.rs').click();

    // Should show diff content
    await expect(page.getByText('println!("Hello")')).toBeVisible();
  });

  test('should switch to Preview tab', async ({ page }) => {
    // Mock tasks API
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock diff API
    await page.route('**/api/tasks/*/diff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDiffResponse),
      });
    });

    // Mock preview status API (no preview running)
    await page.route('**/api/tasks/*/preview', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 404 });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Open ReviewPanel
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');
    await taskCard.getByRole('button', { name: 'Review' }).click();

    // Click Preview tab
    await page.getByRole('button', { name: 'Preview' }).click();

    // Should show Start Preview button
    await expect(page.getByRole('button', { name: 'Start Preview' })).toBeVisible();
  });

  test('should close ReviewPanel when clicking close button', async ({ page }) => {
    // Mock tasks API
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock diff API
    await page.route('**/api/tasks/*/diff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDiffResponse),
      });
    });

    await page.goto('/');

    // Open ReviewPanel
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');
    await taskCard.getByRole('button', { name: 'Review' }).click();

    // ReviewPanel should be visible
    await expect(page.getByText(`Review: ${mockReviewTask.title}`)).toBeVisible();

    // Click close button (the X button)
    await page.locator('button').filter({ has: page.locator('svg path[d*="M6 18L18 6"]') }).click();

    // ReviewPanel should be closed
    await expect(page.getByText(`Review: ${mockReviewTask.title}`)).not.toBeVisible();
  });

  test('should show empty state when no diff changes', async ({ page }) => {
    // Mock tasks API
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: [mockReviewTask] }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock diff API with empty response
    await page.route('**/api/tasks/*/diff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files: [], total_additions: 0, total_deletions: 0 }),
      });
    });

    await page.goto('/');

    // Open ReviewPanel
    const taskCard = page.locator('h3', { hasText: mockReviewTask.title }).locator('..').locator('..');
    await taskCard.getByRole('button', { name: 'Review' }).click();

    // Should show empty state message
    await expect(page.getByText('No changes to display')).toBeVisible();
  });
});
