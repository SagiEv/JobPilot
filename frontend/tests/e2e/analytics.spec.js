import { test, expect } from '@playwright/test';

test.describe('Analytics Journeys', () => {

  test('can view analytics and charts', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Analytics', { exact: true }).click();
    
    // Wait for the Analytics header to be visible
    await expect(page.getByRole('heading', { name: 'Performance Analytics' })).toBeVisible();

    // Verify some of the key analytics sections are present
    await expect(page.getByText('Conversion Funnel')).toBeVisible();
    await expect(page.getByText('Monthly Volume')).toBeVisible();

    // Verify that the RingMeter SVG charts are rendered within the analytics page content.
    // We scope to #sec-analytics to avoid matching hidden sidebar icon SVGs.
    const analyticsSection = page.locator('#sec-analytics');
    await expect(analyticsSection.locator('svg').first()).toBeVisible();
  });
});
