import { test, expect } from '@playwright/test';

test.describe('Application Management Journeys', () => {
  let appName;
  
  test.beforeEach(async ({ page }) => {
    appName = `E2E Corp ${Date.now()}`;
    await page.goto('/');
    await page.getByText('Applications', { exact: true }).first().click();
    // Make sure we're on the applications page
    await expect(page.getByText('+ New Application')).toBeVisible();
  });

  test('can create an application', async ({ page }) => {
    // 1. Create Application
    await page.getByText('+ New Application').click();
    await expect(page.getByRole('heading', { name: 'New Application' })).toBeVisible();

    await page.getByPlaceholder('e.g. Google').fill(appName);
    await page.getByPlaceholder('e.g. Frontend Engineer').fill('Software Engineer');
    
    const saveResponse = page.waitForResponse('**/api/applications');
    await page.getByRole('button', { name: 'Save Application' }).click();
    await saveResponse;

    // Verify modal closes
    await expect(page.getByRole('heading', { name: 'New Application' })).not.toBeVisible();
    
    // Verify it appears in the UI
    await expect(page.getByText(appName).first()).toBeVisible();
  });

  test('can update application status and open details', async ({ page }) => {
    // 1. Create an application first
    await page.getByText('+ New Application').click();
    await page.getByPlaceholder('e.g. Google').fill(appName);
    await page.getByPlaceholder('e.g. Frontend Engineer').fill('Backend Developer');
    const updateResponse = page.waitForResponse('**/api/applications');
    await page.getByRole('button', { name: 'Save Application' }).click();
    await updateResponse;
    await expect(page.getByText(appName).first()).toBeVisible();

    // 2. Open Application Details
    // Depending on the UI, it might be a link or card. We'll click on the text.
    await page.getByText(appName).first().click();
    
    // Ensure we are on the details page by checking for back button or header
    await expect(page.getByText('Back to Tracker')).toBeVisible();
    
    // 3. Update application status
    await page.getByRole('button', { name: /update/i }).click();
    
    // The dropdown has role="combobox" or is a standard select element. We find the select with default value 'Applied'
    const statusSelect = page.locator('.adp-select').first();
    await statusSelect.selectOption('Interviewing');
    
    // A second select appears for stages if Interviewing
    const stageSelect = page.locator('.adp-select').nth(1);
    await stageSelect.selectOption('Technical Interview');
    
    await page.getByRole('button', { name: 'Confirm' }).click();
    
    // Wait for update to reflect
    await expect(page.getByText('Interviewing', { exact: true }).first()).toBeVisible();
  });

  test('can add historical event to application', async ({ page }) => {
    // 1. Create an application
    await page.getByText('+ New Application').click();
    await page.getByPlaceholder('e.g. Google').fill(appName);
    await page.getByPlaceholder('e.g. Frontend Engineer').fill('Software Engineer');
    const addResponse = page.waitForResponse('**/api/applications');
    await page.getByRole('button', { name: 'Save Application' }).click();
    await addResponse;
    await expect(page.getByText(appName).first()).toBeVisible();

    // 2. Go to details
    await page.getByText(appName).first().click();
    
    // 3. Open Activity Log if closed (the chevron button)
    const logHeader = page.getByText('Activity Log');
    await logHeader.click();
    
    // 4. Add a note
    await page.getByPlaceholder('Add a note...').fill('Followed up with recruiter');
    await page.getByRole('button', { name: 'Add Note' }).click();
    
    // Verify the note appears in the timeline
    await expect(page.getByText('Followed up with recruiter')).toBeVisible();
  });

  test('can schedule an interview from dashboard', async ({ page }) => {
    // We assume the "Add Interview" button is on the Dashboard
    await page.goto('/');
    await page.getByText('Dashboard', { exact: true }).first().click();
    
    await page.getByRole('button', { name: '+ Add Interview' }).click();
    
    await expect(page.getByRole('heading', { name: 'Schedule Interview' })).toBeVisible();
    
    await page.getByPlaceholder('e.g. First Round Technical').fill('Final Round');
    // We should be more specific, but using placeholder or label is safer if available
    // Let's use getByLabel or generic approach:
    await page.locator('form').filter({ hasText: 'Schedule Interview' }).locator('input').nth(0).fill('Final Round');
    await page.locator('form').filter({ hasText: 'Schedule Interview' }).locator('input').nth(1).fill('Test Company Inc');
    
    // Fill date time
    await page.locator('input[type="datetime-local"]').fill('2026-10-10T10:00');
    
    await page.getByRole('button', { name: 'Save Interview' }).click();
    
    await expect(page.getByRole('heading', { name: 'Schedule Interview' })).not.toBeVisible();
    
    // Verify it appears in upcoming interviews
    await expect(page.getByText('Final Round')).toBeVisible();
  });
});
