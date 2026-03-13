/**
 * EdgeQuanta E2E Tests
 * Run: npx playwright test
 * Requires: uvicorn server:app --port 8080 (auto-started via playwright.config.ts)
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page loads with hero title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('EDGE QUANTA');
  });

  test('all nav links are present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav.getByText('PLATFORM')).toBeVisible();
    await expect(nav.getByText('OBSERVABILITY')).toBeVisible();
    await expect(nav.getByText('ACCESS')).toBeVisible();
    await expect(nav.getByText('DOCS')).toBeVisible();
    await expect(nav.getByText('CONTACT')).toBeVisible();
  });

  test('navigates to platform page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav >> text=PLATFORM');
    await expect(page).toHaveURL('/platform');
    await expect(page.locator('h1')).toContainText('Submit and track quantum tasks');
  });

  test('navigates to observability page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav >> text=OBSERVABILITY');
    await expect(page).toHaveURL('/observability');
    await expect(page.locator('h1')).toContainText('Live system telemetry');
  });

  test('navigates to access page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav >> text=ACCESS');
    await expect(page).toHaveURL('/access');
    await expect(page.locator('h1')).toContainText('API keys and system reservations');
  });
});

test.describe('Platform — Job Submission', () => {
  test('shows system cards on load', async ({ page }) => {
    await page.goto('/platform');
    // Wait for systems to load from API
    await expect(page.locator('.metric-card').first()).toBeVisible({ timeout: 5000 });
    const cards = page.locator('.metric-card');
    await expect(cards).toHaveCount(4);
  });

  test('submits a quantum job and sees it in the table', async ({ page }) => {
    await page.goto('/platform');
    // Fill out the job form
    await page.selectOption('.form-select', 'superconducting');
    await page.locator('input[type="number"]').first().fill('512');
    await page.locator('input[type="number"]').nth(1).fill('3');

    // Submit
    await page.click('button:text("SUBMIT TASK")');

    // Wait for the job to appear in the table
    await expect(page.locator('.dash-table tbody tr').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.dash-table tbody tr').first().locator('td').first()).toContainText('eq-');
  });
});

test.describe('Observability — Metrics', () => {
  test('shows global metrics cards', async ({ page }) => {
    await page.goto('/observability');
    await expect(page.getByText('TOTAL JOBS')).toBeVisible();
    await expect(page.getByText('COMPLETED')).toBeVisible();
    await expect(page.getByText('FAILED')).toBeVisible();
    await expect(page.getByText('ACTIVE')).toBeVisible();
  });

  test('shows system status table', async ({ page }) => {
    await page.goto('/observability');
    await expect(page.locator('.dash-table tbody tr').first()).toBeVisible({ timeout: 5000 });
    // Should have 4 system rows
    const rows = page.locator('.dash-table tbody tr');
    await expect(rows).toHaveCount(4);
  });
});

test.describe('Access — API Keys', () => {
  test('shows demo key on load', async ({ page }) => {
    await page.goto('/access');
    await expect(page.locator('.key-row').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.key-row').first()).toContainText('Demo Key');
  });

  test('creates a new API key', async ({ page }) => {
    await page.goto('/access');
    await page.locator('input[placeholder*="prod-backend"]').fill('test-e2e-key');
    await page.click('button:text("CREATE KEY")');
    // Should now have 2 keys
    await expect(page.locator('.key-row')).toHaveCount(2, { timeout: 5000 });
  });
});

test.describe('SPA Routing', () => {
  test('direct navigation to /platform works', async ({ page }) => {
    await page.goto('/platform');
    await expect(page.locator('h1')).toContainText('Submit and track quantum tasks');
  });

  test('direct navigation to /observability works', async ({ page }) => {
    await page.goto('/observability');
    await expect(page.locator('h1')).toContainText('Live system telemetry');
  });

  test('direct navigation to /docs works', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.locator('h1')).toContainText('Source material');
  });
});

