import { test, expect } from '@playwright/test';

// Clear storage state for this suite so we can test the real login UI
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication and Smoke Test', () => {
  let testEmail;
  let testPassword;

  test.beforeAll(async ({ request }) => {
    // Register a new test user just for this smoke test
    testEmail = `smoke_${Date.now()}@test-jobpilot.com`;
    testPassword = 'Password123!';
    const apiUrl = 'http://127.0.0.1:5000';
    await request.post(`${apiUrl}/auth/signup`, {
      data: { email: testEmail, password: testPassword }
    });
  });

  test('can login via UI and create an application', async ({ page }) => {
    // 1. Login via UI
    await page.goto('/');

    // Assuming we are redirected to login, or we need to click a login button.
    // The LoginPage has fields for Email and Password.
    await expect(page.getByPlaceholder('Email Address')).toBeVisible({ timeout: 10000 });
    
    await page.getByPlaceholder('Email Address').fill(testEmail);
    await page.getByPlaceholder(/password/i).fill(testPassword);
    
    // There is probably a "Sign In" or "Login" button
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Verify successful login by checking for Dashboard or Applications elements
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 });
    
    // 2. Create an Application
    await page.getByText('Applications', { exact: true }).first().click();
    await expect(page.getByText('+ New Application')).toBeVisible({ timeout: 10000 });

    // 2. Create an Application
    const newAppButton = page.getByText('+ New Application');
    await newAppButton.click();

    await expect(page.getByRole('heading', { name: 'New Application' })).toBeVisible();

    await page.getByPlaceholder('e.g. Google').fill('Smoke Test Corp');
    await page.getByPlaceholder('e.g. Frontend Engineer').fill('Smoke Tester');

    const smokeResponse = page.waitForResponse(res => res.url().includes('/api/applications') && res.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save Application' }).click();
    await smokeResponse;

    // Verify modal closes
    await expect(page.getByRole('heading', { name: 'New Application' })).not.toBeVisible();
    
    // Verify the application appears in the list/board
    await expect(page.getByText('Smoke Test Corp')).toBeVisible();
  });
});
