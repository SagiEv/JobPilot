import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ request, context }) => {
  const email = `testuser_${Date.now()}@test-jobpilot.com`;
  const password = 'Password123!';

  const apiUrl = 'http://127.0.0.1:5000';

  // 1. Register user
  const registerResponse = await request.post(`${apiUrl}/auth/signup`, {
    data: { email, password }
  });
  
  // Ignore 400s if user already exists, but we use a dynamic email so it should be 200/201.
  if (!registerResponse.ok()) {
    console.error('Registration failed:', await registerResponse.text());
  }
  expect(registerResponse.ok()).toBeTruthy();

  // 2. Login via API
  const loginResponse = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password }
  });
  
  expect(loginResponse.ok()).toBeTruthy();
  const loginData = await loginResponse.json();

  // 3. Inject tokens into browser local storage for future contexts
  // The app expects `sb-<project-id>-auth-token` maybe? Or just uses the API token in local storage.
  // The app's authService sets `refresh_token` in localStorage and calls `supabase.auth.setSession`.
  // To simulate this in Playwright, we can just save it into a state file and load it in contexts.
  
  // For Supabase, the best way to mock the session in Playwright without a UI login 
  // is to set the localStorage directly.
  await context.addInitScript((loginData) => {
    // Some apps use 'sb-...' we will set both the custom one and the standard ones.
    // eslint-disable-next-line no-undef
    window.localStorage.setItem('refresh_token', loginData.refresh_token);
    
    // Attempt to set Supabase token if VITE_SUPABASE_URL is known, 
    // but without project ref it's tricky. The app's restoreSession uses `refresh_token` 
    // to automatically get a new access token if supabase session is missing! 
    // Let's verify `restoreSession` behavior: it calls `/auth/refresh` using `refresh_token`.
    // So just setting `refresh_token` might be enough!
  }, loginData);

  // We must also go to the origin so localStorage can be saved for the domain.
  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  
  // wait for the app to initialize the session
  await page.waitForTimeout(1000); 

  // Save the state
  await page.context().storageState({ path: authFile });
});
