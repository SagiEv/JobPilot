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
    // Navigate to Login (assuming root redirects to login if not authenticated)
    await page.goto('/');

    // Fill login form — use getByPlaceholder to avoid strict mode violations.
    // The page has two email inputs: "Recipient Email" (email composer) and
    // "Email Address" (login form). We target the login form specifically.
    await page.getByPlaceholder('Email Address').fill(testEmail);
    await page.getByPlaceholder('Password').fill(testPassword);
    
    // The login button text is "Sign In" (not "Log in")
    await page.getByRole('button', { name: /sign in|processing/i }).click();

    // Verify successful login by checking for Dashboard or Applications elements
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 10000 });
    
    // Navigate to Applications
    await page.getByText('Applications', { exact: true }).first().click();
    await expect(page.getByText('+ New Application')).toBeVisible({ timeout: 10000 });

    // Create an Application
    await page.getByText('+ New Application').click();

    await expect(page.getByRole('heading', { name: 'New Application' })).toBeVisible();

    await page.getByPlaceholder('e.g. Google').fill('Smoke Test Corp');
    await page.getByPlaceholder('e.g. Frontend Engineer').fill('Smoke Tester');

    const responsePromise = page.waitForResponse(
      res => res.url().includes('/api/applications') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Save Application' }).click();
    const response = await responsePromise;

    expect(response.ok(), `POST /api/applications failed with ${response.status()}`).toBeTruthy();

    // Verify modal closes
    await expect(page.getByRole('heading', { name: 'New Application' })).not.toBeVisible();
    
    // Verify the application appears in the list/board
    await expect(page.getByText('Smoke Test Corp')).toBeVisible();
  });
});
