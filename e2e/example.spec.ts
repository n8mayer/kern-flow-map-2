import { test, expect } from '@playwright/test';

test('should display welcome message', async ({ page }) => {
  await page.goto('/');
  const welcomeMessage = await page.textContent('h1');
  expect(welcomeMessage).toBe('Welcome to our application!');
});
