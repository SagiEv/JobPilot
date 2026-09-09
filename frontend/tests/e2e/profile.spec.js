import { test, expect } from '@playwright/test';

test.describe('Profile Page - Experience Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile page assuming standard routing and auth is set up
    await page.goto('/profile');
    // Wait for the page to load by waiting for the CV & Preferences card
    await page.waitForSelector('text=CV & Preferences');
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
    await expect(toast).toBeVisible();
  });
});
