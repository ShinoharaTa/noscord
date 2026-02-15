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

  $: currentPath = $page.url.pathname;
</script>

<div class="sidebar flex flex-col border-r border-border" class:open={isOpen}>
  <div class="sidebar-content flex-1 overflow-y-auto p-0">
    <!-- チャンネル一覧 -->
    <div class="mb-6">
      <div class="flex justify-between items-center px-5 pt-4 pb-2">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-sidebar-muted m-0">チャンネル</h3>
        <div class="flex gap-1">
          <button class="bg-transparent border-none text-sidebar-muted cursor-pointer p-1 rounded-sm text-xs transition-colors hover:bg-surface-hover" on:click={reload} title="リロード">
            <Icon name="refresh" size={16} />
          </button>
          <button class="bg-transparent border-none text-sidebar-muted cursor-pointer p-1 rounded-sm text-xs transition-colors hover:bg-surface-hover" on:click={newThread} title="新規チャンネル">
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
      
      {#if loading}
        <div class="p-5 text-center text-sidebar-muted">読み込み中...</div>
      {:else}
        <div class="flex flex-col">
          <button 
            class="channel-item w-full py-3 px-5 border-none bg-transparent text-sidebar-text text-left cursor-pointer transition-colors rounded-none text-sm hover:bg-surface-hover"
            class:active={currentPath === "/"}
            on:click={() => goto('/')}
          >
            ホーム
          </button>
          <button 
            class="channel-item w-full py-3 px-5 border-none bg-transparent text-sidebar-text text-left cursor-pointer transition-colors rounded-none text-sm hover:bg-surface-hover"
            class:active={currentPath === "/channels"}
            on:click={() => goto('/channels')}
          >
            他のチャンネルを探す
          </button>
          {#each threads as thread}
            <button 
              class="channel-item w-full py-3 px-5 border-none bg-transparent text-sidebar-text text-left cursor-pointer transition-colors rounded-none text-sm hover:bg-surface-hover"
              class:active={currentPath === `/${thread.id}`}
              on:click={() => selectChannel(thread.id)}
            >
              <div class="flex flex-col gap-1">
                <div class="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                  {thread.name !== "" ? thread.name : "無題のチャンネル"}
                </div>
                <div class="channel-meta flex items-center gap-2 text-xs text-sidebar-muted">
                  <Author hex={thread.author} />
                  <span class="text-xs">{parseCreated(thread.latest_update)}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  
  <!-- 設定ボタン -->
  <div class="sidebar-footer shrink-0 flex flex-col gap-2 px-5 pt-4 border-t border-border pb-[calc(16px+env(safe-area-inset-bottom))]">
    <button class="w-full py-3 px-4 border-none bg-surface-hover text-sidebar-text cursor-pointer rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-accent hover:text-white" on:click={() => goto('/develop/design')}>
      <Icon name="info" size={18} />
      <span>デザイン</span>
    </button>
    <button class="w-full py-3 px-4 border-none bg-surface-hover text-sidebar-text cursor-pointer rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-accent hover:text-white" on:click={() => settingsModal.set(true)}>
      <Icon name="gear" size={18} />
      <span>設定</span>
    </button>
  </div>
</div>

<style>
  /* サイドバーのアニメーション・レスポンシブ（Tailwind では表現が複雑な部分） */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    height: 100dvh;
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    z-index: var(--z-sidebar);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  @media (max-width: 767px) {
    .sidebar {
      top: env(safe-area-inset-top);
      height: calc(100vh - env(safe-area-inset-top));
      height: calc(100dvh - env(safe-area-inset-top));
    }
  }

  @media (min-width: 768px) {
    .sidebar {
      position: relative;
      transform: translateX(0);
      top: 0;
      height: 100vh;
      height: 100dvh;
    }

    .sidebar-footer {
      padding-bottom: 16px;
    }
  }

  /* アクティブ状態（条件付きスタイル） */
  .channel-item.active {
    background: var(--primary-color);
    color: white;
  }

  .channel-item.active .channel-meta {
    color: rgba(255, 255, 255, 0.8);
  }
</style> 