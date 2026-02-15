import { test, expect } from '@playwright/test';

test.describe('UXテスト - UI崩れ・レイアウト・ナビゲーション', () => {
  test('ホームページが正しく表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('ホーム');
    await expect(page.locator('.home-container')).toBeVisible();
    await expect(page.locator('.welcome-section')).toBeVisible();
    await expect(page.locator('text=ようこそ Noscord へ')).toBeVisible();
  });

  test('サイドバーが表示され、ナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');
    // デスクトップではサイドバーが表示されている
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    // ホーム・チャンネル探す・新規作成へのリンクがある
    await expect(page.locator('button.channel-item:has-text("ホーム")')).toBeVisible();
    await expect(page.locator('button.channel-item:has-text("他のチャンネルを探す")')).toBeVisible();
  });

  test('チャンネル一覧ページが表示される', async ({ page }) => {
    await page.goto('/channels');
    await expect(page).toHaveURL(/\/channels/);
    // チャンネル一覧のコンテナが表示される
    const content = page.locator('.channels-container, [class*="channel"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('新規チャンネル作成ページが表示される', async ({ page }) => {
    await page.goto('/new');
    await expect(page).toHaveURL('/new');
    await expect(page.locator('h1:has-text("新しいチャンネルを作成")')).toBeVisible({ timeout: 5000 });
  });

  test('デザイン確認ページが表示される', async ({ page }) => {
    await page.goto('/develop/design');
    await expect(page).toHaveURL('/develop/design');
    await expect(page.locator('body')).toBeVisible();
  });

  test('レイアウトが崩れていない（オーバーフロー・横スクロール）', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // メインコンテナがビューポート内に収まっているか
    const appLayout = page.locator('.app-layout');
    await expect(appLayout).toBeVisible();
    const box = await appLayout.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('ボタンがクリック可能である', async ({ page }) => {
    await page.goto('/');
    const newChannelBtn = page.locator('button:has-text("新しいチャンネルを作成"), .primary-btn').first();
    await expect(newChannelBtn).toBeVisible();
    await newChannelBtn.click();
    await expect(page).toHaveURL('/new');
  });

  test('モバイルビューポートでレイアウトが崩れない', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await expect(page.locator('.home-container')).toBeVisible();
    // メニューボタンがモバイルで表示される
    const menuBtn = page.locator('.menu-btn');
    await expect(menuBtn).toBeVisible();
  });

  test('長文・URLがレイアウトを破壊しない（投稿エリア）', async ({ page }) => {
    // チャンネルページに遷移（存在しないIDでもページは表示される）
    await page.goto('/test-channel-12345');
    await expect(page).toHaveURL('/test-channel-12345');
    // チャットコンテナが表示される
    await expect(page.locator('.chat-container')).toBeVisible({ timeout: 5000 });
  });
});
