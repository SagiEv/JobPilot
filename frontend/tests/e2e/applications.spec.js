import { test, expect } from '@playwright/test';

/**
 * Helper: create an application via the "New Application" modal and wait for the
 * backend to confirm the save. Returns once the modal has closed and the new
 * application row is visible in the list.
 *
 * IMPORTANT – we intentionally do NOT put `res.ok()` inside the waitForResponse
 * predicate. If we did, a non-2xx response (e.g. 400 validation error) would
 * cause the predicate to silently never match, and the test would hang for the
 * full 30 s timeout with no useful error message. Instead, we capture ANY
 * matching response and assert on its status separately so failures are clear.
 */
async function createApplicationViaModal(page, company, role) {
  await page.getByText('+ New Application').click();
  await expect(page.getByRole('heading', { name: 'New Application' })).toBeVisible();

  await page.getByPlaceholder('e.g. Google').fill(company);
  await page.getByPlaceholder('e.g. Frontend Engineer').fill(role);

  const responsePromise = page.waitForResponse(
    res => res.url().includes('/api/applications') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Save Application' }).click();
  const response = await responsePromise;

  // Fail fast with a clear message if the API returned an error
  expect(response.ok(), `POST /api/applications failed with ${response.status()}`).toBeTruthy();

  // Verify modal closes
  await expect(page.getByRole('heading', { name: 'New Application' })).not.toBeVisible();

  // Verify it appears in the UI
  await expect(page.getByText(company).first()).toBeVisible();
}

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
    await createApplicationViaModal(page, appName, 'Software Engineer');
  });

  test('can update application status and open details', async ({ page }) => {
    // 1. Create an application first
    await createApplicationViaModal(page, appName, 'Backend Developer');

    // 2. Open Application Details
    await page.getByText(appName).first().click();
    
    // Ensure we are on the details page by checking for back button or header
    await expect(page.getByText('Back to Tracker')).toBeVisible();
    
    // 3. Update application status
    await page.getByRole('button', { name: /update/i }).click();
    
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
    await createApplicationViaModal(page, appName, 'Software Engineer');

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
    const interviewModal = page.locator('.modal').filter({ hasText: 'Schedule Interview' });
    await interviewModal.getByPlaceholder('e.g. First Round Technical').fill('Final Round');
    await interviewModal.locator('.modal-section').filter({ hasText: 'Company' }).locator('input').fill('Test Company Inc');
    
    // Fill date time
    await page.locator('input[type="datetime-local"]').fill('2026-10-10T10:00');
    
    await page.getByRole('button', { name: 'Save Interview' }).click();
    
    await expect(page.getByRole('heading', { name: 'Schedule Interview' })).not.toBeVisible();
    
    // Verify it appears in upcoming interviews
    await expect(page.getByText('Final Round')).toBeVisible();
  });
});
