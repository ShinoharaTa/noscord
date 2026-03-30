<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '$lib/components/icons.svelte';
</script>

<div class="error-page">
  <div class="error-content">
    <div class="error-code">{$page.status}</div>
    <h1 class="error-title">
      {#if $page.status === 404}
        ページが見つかりません
      {:else if $page.status === 500}
        サーバーエラー
      {:else}
        エラーが発生しました
      {/if}
    </h1>
    <p class="error-message">
      {$page.error?.message || 'お探しのページは存在しないか、移動した可能性があります。'}
    </p>
    <a href="/" class="error-home-link">
      <Icon name="home" size={16} />
      <span>ホームに戻る</span>
    </a>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 24px;
  }

  .error-content {
    text-align: center;
    max-width: 420px;
  }

  .error-code {
    font-size: 4rem;
    font-weight: 800;
    color: var(--primary-color, #059669);
    line-height: 1;
    margin-bottom: 8px;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-text, #1a1d21);
    margin: 0 0 12px;
  }

  .error-message {
    color: var(--secondary-text, #666);
    font-size: 0.938rem;
    line-height: 1.6;
    margin: 0 0 24px;
  }

  .error-home-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--primary-color, #059669);
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.875rem;
    transition: background-color 0.15s;
  }

  .error-home-link:hover {
    background: var(--primary-color-hover, #047857);
  }
</style>
