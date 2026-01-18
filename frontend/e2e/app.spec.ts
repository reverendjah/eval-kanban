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

      // Disable Plan Mode to use direct creation
      await page.getByRole('checkbox', { name: /Plan Mode/i }).uncheck();

      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('should create a task and display it in To Do column', async ({ page }) => {
      const taskTitle = `Test Task ${Date.now()}`;

      await page.getByRole('button', { name: /New Task/i }).click();
      await page.getByPlaceholder('Task title...').fill(taskTitle);
      await page.getByPlaceholder('Describe the task for Claude...').fill('Test description');

      // Disable Plan Mode to use direct creation
      await page.getByRole('checkbox', { name: /Plan Mode/i }).uncheck();

      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByRole('heading', { name: 'New Task' })).not.toBeVisible();
      await expect(page.getByText(taskTitle).first()).toBeVisible();
    });
  });

  test.describe('Task Deletion', () => {
    test('should delete a task when confirmed', async ({ page }) => {
      const taskTitle = `Delete Test ${Date.now()}`;

      await page.getByRole('button', { name: /New Task/i }).click();
      await page.getByPlaceholder('Task title...').fill(taskTitle);

      // Disable Plan Mode to use direct creation
      await page.getByRole('checkbox', { name: /Plan Mode/i }).uncheck();

      await page.getByRole('button', { name: 'Create Task' }).click();

      // Wait for modal to close first
      await expect(page.getByRole('heading', { name: 'New Task' })).not.toBeVisible();
      await expect(page.getByText(taskTitle).first()).toBeVisible();

      // Count tasks before delete
      const countBefore = await page.getByRole('heading', { name: taskTitle }).count();

      page.on('dialog', (dialog) => dialog.accept());

      // Find the task card by its title h3, go up to the task card div, and click Delete
      const taskCard = page.locator('h3', { hasText: taskTitle }).first().locator('..').locator('..');
      await taskCard.getByRole('button', { name: 'Delete' }).click();

      // Wait for deletion - should have one less task (handles potential duplicates)
      await expect(page.getByRole('heading', { name: taskTitle })).toHaveCount(countBefore - 1, { timeout: 10000 });
    });
  });

  test.describe('Task Interaction', () => {
    test('should show Start button for tasks in To Do', async ({ page }) => {
      const taskTitle = `Start Test ${Date.now()}`;

      await page.getByRole('button', { name: /New Task/i }).click();
      await page.getByPlaceholder('Task title...').fill(taskTitle);

      // Disable Plan Mode to use direct creation
      await page.getByRole('checkbox', { name: /Plan Mode/i }).uncheck();

      await page.getByRole('button', { name: 'Create Task' }).click();

      await expect(page.getByText(taskTitle).first()).toBeVisible();

      // Find the task card by its title h3 and check for Start button
      const taskCard = page.locator('h3', { hasText: taskTitle }).first().locator('..').locator('..');
      await expect(taskCard.getByRole('button', { name: 'Start' })).toBeVisible();
    });
  });

  test.describe('Plan Mode', () => {
    test('should show Plan Mode checkbox checked by default', async ({ page }) => {
      await page.getByRole('button', { name: /New Task/i }).click();

      // Plan Mode checkbox should be visible and checked by default
      const planModeCheckbox = page.getByRole('checkbox', { name: /Plan Mode/i });
      await expect(planModeCheckbox).toBeVisible();
      await expect(planModeCheckbox).toBeChecked();

      // Button should say "Start Planning" not "Create Task"
      await expect(page.getByRole('button', { name: 'Start Planning' })).toBeVisible();
    });

    test('should switch button text when toggling Plan Mode', async ({ page }) => {
      await page.getByRole('button', { name: /New Task/i }).click();

      // Initially should show "Start Planning"
      await expect(page.getByRole('button', { name: 'Start Planning' })).toBeVisible();

      // Uncheck Plan Mode
      await page.getByRole('checkbox', { name: /Plan Mode/i }).uncheck();

      // Now should show "Create Task"
      await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible();

      // Check Plan Mode again
      await page.getByRole('checkbox', { name: /Plan Mode/i }).check();

      // Should show "Start Planning" again
      await expect(page.getByRole('button', { name: 'Start Planning' })).toBeVisible();
    });

    // Skip: Requires real Claude instance - run manually or in integration environment
    test.skip('should show loading state when starting Plan Mode', async ({ page }) => {
      await page.getByRole('button', { name: /New Task/i }).click();

      // Fill in the form
      await page.getByPlaceholder('Task title...').fill('Plan Mode Test');
      await page.getByPlaceholder('Describe the task for Claude...').fill('Test description for plan mode');

      // Plan Mode is ON by default, click to start planning
      await page.getByRole('button', { name: 'Start Planning' }).click();

      // Should show loading state - "Claude is thinking..." text with spinner
      // Modal should stay open (not close like with Create Task)
      await expect(page.locator('text=Starting...').or(page.locator('text=Claude is thinking...'))).toBeVisible({ timeout: 10000 });
    });

    // Skip: Requires real Claude instance - run manually or in integration environment
    test.skip('should complete Plan Mode Q&A flow', async ({ page }) => {
      // This test requires a running Claude instance and may take longer
      test.setTimeout(180000); // 3 minutes timeout

      await page.getByRole('button', { name: /New Task/i }).click();

      // Fill in the form (Plan Mode is ON by default)
      await page.getByPlaceholder('Task title...').fill('Plan Mode E2E Test');
      await page.getByPlaceholder('Describe the task for Claude...').fill('Create a simple hello world function in TypeScript');

      // Start planning
      await page.getByRole('button', { name: 'Start Planning' }).click();

      // Wait for loading state or question to appear
      await expect(
        page.locator('text=Claude is thinking...').or(page.getByText(/Question \d+/))
      ).toBeVisible({ timeout: 30000 });

      // Wait for question to appear (exit "thinking" state)
      await expect(page.getByText(/Question \d+/)).toBeVisible({ timeout: 120000 });

      // Select first option (radio/checkbox)
      const firstOption = page.locator('input[name="answer"]').first();
      await firstOption.check();

      // Submit answer
      await page.getByRole('button', { name: 'Submit Answer' }).click();

      // Wait for next question or summary (Execute Plan button)
      await expect(
        page.getByText(/Question \d+/).or(page.getByRole('button', { name: 'Execute Plan' }))
      ).toBeVisible({ timeout: 120000 });
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
