<script lang="ts">
  import { goto } from "$app/navigation";
  import { parseCreated } from "$lib/app";
  import Author from "$lib/components/author.svelte";
  import Icon from "$lib/components/icons.svelte";
  import { settingsModal, channelList, channelLoading, loadChannelList, refreshChannelList } from "$lib/store";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "websocket-polyfill";
  import type { SingleThread } from "$lib/nostr";

  export let isOpen = false;

  let threads: SingleThread[] = [];

  onMount(() => {
    loadChannelList();
  });

  $: threads = $channelList;
  $: loading = $channelLoading;

  const reload = async () => {
    await refreshChannelList();
  };

  const newThread = () => goto("/new");
  
  const selectChannel = (channelId: string) => {
    goto(`/${channelId}`);
    // モバイル・タブレットではサイドバーを閉じる
    if (window.innerWidth < 1024) {
      isOpen = false;
    }
  };

  $: currentChannelId = $page.params.channel_id;
</script>

<div class="sidebar" class:open={isOpen}>
  <div class="sidebar-content">
    <!-- チャンネル一覧 -->
    <div class="section">
      <div class="section-header">
        <h3>チャンネル</h3>
        <div class="section-actions">
          <button class="icon-btn" on:click={reload} title="リロード">
            <Icon name="refresh" size={16} />
          </button>
          <button class="icon-btn" on:click={newThread} title="新規チャンネル">
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
      
      {#if loading}
        <div class="loading">読み込み中...</div>
      {:else}
        <div class="channel-list">
          <button 
            class="channel-item" 
            class:active={!currentChannelId}
            on:click={() => goto('/')}
          >
            ホーム
          </button>
          {#each threads as thread}
            <button 
              class="channel-item" 
              class:active={currentChannelId === thread.id}
              on:click={() => selectChannel(thread.id)}
            >
              <div class="channel-info">
                <div class="channel-name">
                  {thread.name !== "" ? thread.name : "無題のチャンネル"}
                </div>
                <div class="channel-meta">
                  <Author hex={thread.author} />
                  <span class="last-update">{parseCreated(thread.latest_update)}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  
  <!-- 設定ボタン -->
  <div class="sidebar-footer">
    <button class="footer-btn" on:click={() => goto('/develop/design')}>
      <Icon name="info" size={18} />
      <span>デザイン</span>
    </button>
    <button class="settings-btn" on:click={() => settingsModal.set(true)}>
      <Icon name="gear" size={18} />
      <span>設定</span>
    </button>
  </div>
</div>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  @media (max-width: 767px) {
    .sidebar {
      top: env(safe-area-inset-top);
      height: calc(100vh - env(safe-area-inset-top));
    }
  }

  @media (min-width: 768px) {
    .sidebar {
      position: relative;
      transform: translateX(0);
      top: 0;
      height: 100vh;
    }

    .sidebar-footer {
      padding-bottom: 16px;
    }
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .section {
    margin-bottom: 24px;
  }

  .section-header {
    padding: 16px 20px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-header h3 {
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--sidebar-muted);
    margin: 0;
  }

  .section-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--sidebar-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .icon-btn:hover {
    background: var(--hover-bg);
  }

  .loading {
    padding: 20px;
    text-align: center;
    color: var(--sidebar-muted);
  }

  .channel-list {
    display: flex;
    flex-direction: column;
  }

  .channel-item {
    width: 100%;
    padding: 12px 20px;
    border: none;
    background: none;
    color: var(--sidebar-text);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 0;
    font-size: 0.9rem;
  }

  .channel-item:hover {
    background: var(--hover-bg);
  }

  .channel-item.active {
    background: var(--primary-color);
    color: white;
  }

  .channel-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .channel-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .channel-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--sidebar-muted);
  }

  .channel-item.active .channel-meta {
    color: rgba(255, 255, 255, 0.8);
  }

  .last-update {
    font-size: 0.75rem;
  }

  .sidebar-footer {
    padding: 16px 20px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .footer-btn,
  .settings-btn {
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: var(--hover-bg);
    color: var(--sidebar-text);
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s;
  }

  .footer-btn:hover,
  .settings-btn:hover {
    background: var(--primary-color);
    color: white;
  }
</style> 