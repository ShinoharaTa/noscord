import { test, expect } from '@playwright/test';

/**
 * 各ページのスクリーンショットを撮影して UI を目視確認するためのテスト。
 * dev サーバー (localhost:5173) に対して実行する。
 */
test.describe('UIスクリーンショット監査', () => {

  // --- デスクトップ (1280x720) ---

  test('デスクトップ: ホームページ', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/desktop-home.png', fullPage: true });
  });

  test('デスクトップ: チャンネル一覧', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/channels');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/desktop-channels.png', fullPage: true });
  });

  test('デスクトップ: 新規チャンネル作成', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/new');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/desktop-new.png', fullPage: true });
  });

  test('デスクトップ: デザイン確認', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/develop/design');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/desktop-design.png', fullPage: true });
  });

  // --- モバイル (375x667) ---

  test('モバイル: ホームページ', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/mobile-home.png', fullPage: true });
  });

  test('モバイル: チャンネル一覧', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/channels');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/mobile-channels.png', fullPage: true });
  });

  test('モバイル: 新規チャンネル作成', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/new');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/mobile-new.png', fullPage: true });
  });

});
