import { test, expect, Page } from '@playwright/test';
import { DEFAULT_YEAR, MIN_YEAR, MAX_YEAR } from '../src/store/store'; // Adjust path as needed

const DEFAULT_APP_TITLE = "Kern River Flow Map"; // Assuming this is the app title
const OVERVIEW_DASH_TITLE = "System Overview"; // From App.integration.test.tsx mock
const SECTION_DASH_PROMPT = "Select a section on the map to see details."; // From App.integration.test.tsx mock

// Helper function to check for common elements
async function checkCommonElements(page: Page) {
  await expect(page.getByText(DEFAULT_APP_TITLE)).toBeVisible();
  // MapPane (DeckGL canvas) - check for its wrapper or canvas itself
  await expect(page.locator('#deckgl-wrapper canvas')).toBeVisible({ timeout: 10000 }); // Increased timeout for map load
  // TimeBar
  await expect(page.getByRole('slider', { name: /Year:/i })).toBeVisible(); // Assuming aria-label like "Year: 1995"
  // OverviewDash
  await expect(page.getByText(OVERVIEW_DASH_TITLE)).toBeVisible();
  // SectionDash
  await expect(page.getByText(SECTION_DASH_PROMPT)).toBeVisible();
}

test.describe('E2E Tests for Kern River Flow Map Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the root before each test
    await page.goto('/');
    // Wait for the map canvas to be visible as a proxy for app readiness
    await expect(page.locator('#deckgl-wrapper canvas')).toBeVisible({ timeout: 10000 });
  });

  test('Initial Load and Default State', async ({ page }) => {
    await checkCommonElements(page);

    // Check default year in TimeBar (assuming the slider's aria-valuenow or a visible span)
    // The TimeBar test used a span with class "text-lg font-medium" for the year
    await expect(page.locator('span.text-lg.font-medium', { hasText: DEFAULT_YEAR })).toBeVisible();
    await expect(page.getByRole('slider', { name: /Year:/i })).toHaveAttribute('aria-valuenow', DEFAULT_YEAR);

    // Check URL hash - URLStateSync sets #/year/YYYY by default
    await expect(page).toHaveURL(new RegExp(`.*/#/year/${DEFAULT_YEAR}$`));

    // Check that OverviewDash has some default content (e.g. KPIs for default year)
    // This requires knowing what content to expect. Let's assume "Total System Flow" is a KPI label.
    await expect(page.getByText("Total System Flow")).toBeVisible();
  });

  test('Time Bar Interaction', async ({ page }) => {
    const targetYear = String(MIN_YEAR + 10); // e.g., 1989

    // Option 1: Drag slider (might be complex to get exact value)
    // Option 2: Use dropdown if available (more robust)
    // The TimeBar integration test used a dropdown button with aria-label "Select Year"
    const yearDropdownTrigger = page.getByRole('button', { name: 'Select Year' });
    await yearDropdownTrigger.click();
    await page.getByRole('menuitem', { name: targetYear }).click();

    // Assert displayed year changed
    await expect(page.locator('span.text-lg.font-medium', { hasText: targetYear })).toBeVisible();
    await expect(page.getByRole('slider', { name: /Year:/i })).toHaveAttribute('aria-valuenow', targetYear);

    // Assert URL hash changed
    await expect(page).toHaveURL(new RegExp(`.*/#/year/${targetYear}$`));

    // Assert OverviewDash data updated (e.g. a title containing the year)
    // From OverviewDash.integration.test.tsx mock: `Key Performance Indicators for ${options?.year || DEFAULT_YEAR}`
    await expect(page.getByText(`Key Performance Indicators for ${targetYear}`)).toBeVisible();
  });

  test('Map Interaction (Section Selection) - Placeholder', async ({ page }) => {
    // This test is highly dependent on how map features are rendered and made interactive.
    // Scenario: Click on a map feature, SectionDash updates, URL updates.

    // Step 1: Identify a map feature.
    // This might involve:
    // - Looking for SVG elements if Deck.gl uses an SVG layer for interaction.
    // - Clicking specific coordinates: await page.locator('#deckgl-wrapper canvas').click({ position: { x: ..., y: ... } });
    // - Using a data-testid if features somehow have one (unlikely for pure Deck.gl canvas).
    // For now, let's assume a feature can be clicked and it has a known ID 'section1' (from mockFlowFeatures)
    // and results in a known name 'Section 1' appearing in SectionDash.

    // Placeholder for click action - this will likely fail without a proper selector/method
    // await page.locator('SOME_SELECTOR_FOR_A_MAP_FEATURE_SECTION1').click();
    test.skip(true, 'Map interaction test needs specific selectors or a robust way to interact with Deck.gl features.');

    // If click was successful:
    // Assert SectionDash updates
    // const sectionDashTitle = page.getByText('Section 1'); // Assuming name appears as title
    // await expect(sectionDashTitle).toBeVisible({ timeout: 5000 });
    // await expect(page.getByText(SECTION_DASH_PROMPT)).not.toBeVisible();

    // Assert URL hash updates to include section
    // await expect(page).toHaveURL(new RegExp(`.*/#/section/section1/year/${DEFAULT_YEAR}$`)); // Assuming default year is still active
  });

  test('URL State Synchronization (Deep Linking)', async ({ page }) => {
    const targetYear = '2000';
    const targetSectionId = 'section1'; // From mockFlowFeatures
    const sectionName = 'Section 1'; // Corresponding name

    // Navigate to a URL with pre-set hash
    await page.goto(`/#/section/${targetSectionId}/year/${targetYear}`);
    await expect(page.locator('#deckgl-wrapper canvas')).toBeVisible({ timeout: 10000 }); // Wait for map

    // Assert TimeBar shows the targetYear
    await expect(page.locator('span.text-lg.font-medium', { hasText: targetYear })).toBeVisible();
    await expect(page.getByRole('slider', { name: /Year:/i })).toHaveAttribute('aria-valuenow', targetYear);

    // Assert SectionDash shows details for targetSectionId
    // Check for section name and that the initial prompt is gone.
    await expect(page.getByText(sectionName)).toBeVisible(); // This assumes section name is displayed
    await expect(page.getByText(SECTION_DASH_PROMPT)).not.toBeVisible();

    // Assert OverviewDash shows data for targetYear
    await expect(page.getByText(`Key Performance Indicators for ${targetYear}`)).toBeVisible();
  });

  test('Basic Data Display Checks on Year Change', async ({ page }) => {
    // This test focuses on ensuring data in dashboards updates when year changes.
    // It's similar to parts of 'Time Bar Interaction' but could be more detailed.

    const initialYear = DEFAULT_YEAR;
    const nextYear = String(Number(DEFAULT_YEAR) + 1);

    // Check initial KPI value or text in OverviewDash (highly dependent on actual content)
    // Let's assume a specific text format for a KPI.
    // Example: "Total System Flow: XXX af" - this requires a stable selector.
    // For now, check for the year-dependent title.
    await expect(page.getByText(`Key Performance Indicators for ${initialYear}`)).toBeVisible();

    // Change year using the dropdown
    const yearDropdownTrigger = page.getByRole('button', { name: 'Select Year' });
    await yearDropdownTrigger.click();
    await page.getByRole('menuitem', { name: nextYear }).click();
    await page.waitForURL(new RegExp(`.*/#/year/${nextYear}$`));


    // Assert KPI title in OverviewDash updated
    await expect(page.getByText(`Key Performance Indicators for ${nextYear}`)).toBeVisible();

    // If a section was selected, its data for the new year should also update.
    // This requires combining with section selection logic.
    // For simplicity, this test focuses on OverviewDash.
  });
});
