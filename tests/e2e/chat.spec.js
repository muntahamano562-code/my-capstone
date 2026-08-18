import { test, expect } from '@playwright/test';

test('primary chat flow returns a mocked assistant response', async ({ page }) => {
  await page.goto('/');

  // The chat input is exposed via its accessible label.
  const input = page.getByLabel('Message to AI Career Assistant');
  await expect(input).toBeVisible();

  // Enter a realistic question and send it.
  await input.fill('What should I learn next about frontend?');
  await page.getByRole('button', { name: 'Send' }).click();

  // The assistant message appears and streams the mocked reply.
  const assistant = page.getByRole('article', { name: 'Assistant message' });
  await expect(assistant).toBeVisible();
  await expect(assistant).toContainText('Mock:');
});
