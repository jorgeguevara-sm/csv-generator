const { test, expect } = require('@playwright/test');

test.describe('Generador de CSV', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Generador de CSV Pro/);
    await expect(page.locator('h1')).toHaveText('Generador de CSV');
  });

  test('should initialize with default columns', async ({ page }) => {
    const columns = page.locator('.column-item');
    await expect(columns).toHaveCount(3);

    await expect(columns.nth(0).locator('.col-name')).toHaveValue('ID');
    await expect(columns.nth(1).locator('.col-name')).toHaveValue('Descripción');
    await expect(columns.nth(2).locator('.col-name')).toHaveValue('Fecha');
  });

  test('should add a new column', async ({ page }) => {
    await page.click('#add-column-btn');
    const columns = page.locator('.column-item');
    await expect(columns).toHaveCount(4);
    await expect(columns.last().locator('.col-name')).toHaveValue('Nueva Columna');
  });

  test('should remove a column', async ({ page }) => {
    const initialCount = await page.locator('.column-item').count();
    await page.locator('.remove-col-btn').first().click();
    await expect(page.locator('.column-item')).toHaveCount(initialCount - 1);
  });

  test('should add and delete segments', async ({ page }) => {
    // Initial segment
    await expect(page.locator('.segment-tab')).toHaveCount(1);

    // Add segment
    await page.click('#add-segment-btn');
    await expect(page.locator('.segment-tab')).toHaveCount(2);
    await expect(page.locator('.segment-tab.active')).toHaveText('Segmento 2');

    // Delete segment
    await page.click('#delete-segment-btn');
    await expect(page.locator('.segment-tab')).toHaveCount(1);
  });

  test('should change column type and show correct config', async ({ page }) => {
    const firstCol = page.locator('.column-item').first();
    const typeSelect = firstCol.locator('.col-type');

    await typeSelect.selectOption('email');
    // Email has no extra config in template
    await expect(firstCol.locator('.config-options')).toBeEmpty();

    await typeSelect.selectOption('number');
    await expect(firstCol.locator('.config-options input[name="min"]')).toBeVisible();
    await expect(firstCol.locator('.config-options input[name="max"]')).toBeVisible();
  });

  test('should download CSV when generate button is clicked', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('#generate-btn');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/data_.*\.csv/);
  });

  test('should export configuration', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/config_csv_generator_.*\.json/);
  });
});
