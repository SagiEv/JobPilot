import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ request, context }) => {
  const email = `testuser_${Date.now()}@test-jobpilot.com`;
  const password = 'Password123!';

  const apiUrl = 'http://127.0.0.1:5000';

  // 1. Register via API
  const registerResponse = await request.post(`${apiUrl}/auth/signup`, {
    data: { email, password }
  });
  
  // Dynamic email means this should always be 200/201
  expect(registerResponse.ok(), `Signup failed with status ${registerResponse.status()}`).toBeTruthy();

  // 2. Login via API
  const loginResponse = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password }
  });
  
  expect(loginResponse.ok(), `Login failed with status ${loginResponse.status()}`).toBeTruthy();
  const loginData = await loginResponse.json();

  // 3. Inject tokens into browser local storage for future contexts
  await context.addInitScript((data) => {
    // eslint-disable-next-line no-undef
    window.localStorage.setItem('refresh_token', data.refresh_token);
  }, loginData);

  // We must go to the origin so localStorage can be saved for the domain.
  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  
  // Wait for the app to initialize the session
  await page.waitForTimeout(1000);

  // Save the state
  await page.context().storageState({ path: authFile });
});
