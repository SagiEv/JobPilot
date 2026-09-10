import { test, expect } from '@playwright/test';

test.describe('Profile Page - Experience Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root (Dashboard) which uses the globally authenticated state
    await page.goto('/');
    
    // Ensure Dashboard is fully loaded by waiting for its specific heading
    await expect(page.getByRole('heading', { name: 'Welcome back, Job Hunter!' })).toBeVisible({ timeout: 10000 });
    
    // Navigate to profile via UI using robust locator
    await page.locator('.nav-item').filter({ hasText: /^Profile$/ }).click();
    
    // Wait for the Profile page to load by looking for the Personal Info section
    await expect(page.locator('text=Personal Info').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display toast when trying to add empty experience', async ({ page }) => {
    // We try to add an experience. First find the "Current Experience" editor
    const currentExpSection = page.locator('.experience-editor').filter({ hasText: 'Current Experience' });
    const addRoleBtn = currentExpSection.locator('button', { hasText: '+ Add Role' });
    
    // Add one role (if list is empty, this adds an empty role)
    await addRoleBtn.click();
    
    // Attempt to add another role while the previous one is still empty
    await addRoleBtn.click();

    // Verify toast appears
    const toast = page.locator('text=Please fill out the existing experience before adding a new one.');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
