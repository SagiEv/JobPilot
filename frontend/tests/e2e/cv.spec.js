import { test, expect } from '@playwright/test';

test.describe('CV and Tailoring Journeys', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to the tailor page
    await page.goto('/tailor');
    // Ensure page loaded
    await expect(page.getByRole('heading', { name: 'Tailor Your CV' })).toBeVisible();
  });

  test('can tailor CV with AI and export it (mocked AI response)', async ({ page }) => {
    // We mock the backend job creation and polling for AI tailoring 
    // to avoid using real API tokens during E2E tests.
    
    // 1. Mock the initial job creation
    await page.route('**/api/tailor', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: 'mock-job-123' })
      });
    });

    // 2. Mock the job status polling
    await page.route('**/api/jobs/mock-job-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'completed',
          result_data: {
            tailored_cv: '# Tailored CV\n\nThis is a mocked tailored CV response.',
            tailoring_report: { job_title: 'Software Engineer' },
            overall_score: 85,
            projected_score: 95
          }
        })
      });
    });

    // 3. Fill in job description
    await page.getByPlaceholder('https://jobs...').fill('https://example.com/job');
    await page.locator('textarea').first().fill('Looking for a React developer with Playwright experience.');

    // 4. Select "Use profile CV" (should be default but let's click to be sure)
    await page.getByLabel('Or use active profile CV').check();

    // 5. Run AI Tailor
    const runBtn = page.getByRole('button', { name: /Run AI Tailor/i });
    
    // If the button is disabled because AI key is not set, we mock the settings response
    await page.route('**/api/settings', async route => {
      const response = await route.fetch();
      const json = await response.json();
      json.groq_token_set = true;
      json.ai_routing = { cvTailoring: { provider: 'groq' } };
      await route.fulfill({ response, json });
    });
    
    // Reload to apply mocked settings
    await page.reload();
    await page.getByPlaceholder('https://jobs...').fill('https://example.com/job');
    await page.locator('textarea').first().fill('Looking for a React developer with Playwright experience.');
    
    await runBtn.click();

    // 6. Verify success state
    await expect(page.getByText('Score: 85 → 95')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This is a mocked tailored CV response.')).toBeVisible();

    // 7. Test Export (Download)
    // Playwright can intercept downloads
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBe('Tailored_CV.md');
    
    // We can also test the copy button
    // It requires clipboard permissions in the browser context
  });
});
