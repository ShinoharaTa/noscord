<script lang="ts">
  import { goto } from "$app/navigation";
  import { parseCreated } from "$lib/app";
  import Author from "$lib/components/author.svelte";
  import Icon from "$lib/components/icons.svelte";
  import { settingsModal, channelList, channelLoading, loadChannelList, refreshChannelList, hasUnread } from "$lib/store";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "websocket-polyfill";
  import type { SingleThread } from "$lib/nostr";

  export let isOpen = false;

  let threads: SingleThread[] = [];
  let searchQuery = "";

  onMount(() => {
    loadChannelList();
  });

  $: threads = $channelList;
  $: loading = $channelLoading;

  $: filteredThreads = searchQuery.trim()
    ? threads.filter(t => {
        const q = searchQuery.toLowerCase();
        const name = (t.name || "").toLowerCase();
        return name.includes(q);
      })
    : threads;

  const reload = async () => {
    await refreshChannelList();
  };

  const newThread = () => goto("/new");
  
  const selectChannel = (channelId: string) => {
    goto(`/${channelId}`);
    if (window.innerWidth < 1024) {
      isOpen = false;
    }
  };

  const clearSearch = () => {
    searchQuery = "";
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
      
      <!-- チャンネル検索 -->
      <div class="px-4 pb-2">
        <div class="search-box">
          <Icon name="search" size={14} />
          <input
            type="search"
            bind:value={searchQuery}
            placeholder="チャンネルを検索"
            class="search-input"
            autocomplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
          {#if searchQuery}
            <button class="search-clear" on:click={clearSearch}>
              <Icon name="x" size={12} />
            </button>
          {/if}
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
          {#each filteredThreads as thread (thread.id)}
            {@const unread = hasUnread(thread.id, thread.latest_update)}
            <button 
              class="channel-item w-full py-3 px-5 border-none bg-transparent text-sidebar-text text-left cursor-pointer transition-colors rounded-none text-sm hover:bg-surface-hover"
              class:active={currentPath === `/${thread.id}`}
              class:unread={unread && currentPath !== `/${thread.id}`}
              on:click={() => selectChannel(thread.id)}
            >
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <div class="font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0" class:font-bold={unread}>
                    {thread.name !== "" ? thread.name : "無題のチャンネル"}
                  </div>
                  {#if unread && currentPath !== `/${thread.id}`}
                    <span class="unread-dot"></span>
                  {/if}
                </div>
                <div class="channel-meta flex items-center gap-2 text-xs text-sidebar-muted">
                  <Author hex={thread.author} />
                  <span class="text-xs">{parseCreated(thread.latest_update)}</span>
                </div>
              </div>
            </button>
          {:else}
            {#if searchQuery}
              <div class="px-5 py-3 text-sm text-sidebar-muted text-center">
                「{searchQuery}」に一致するチャンネルはありません
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
  
  <!-- 設定ボタン -->
  <div class="sidebar-footer shrink-0 flex flex-col gap-2 px-5 pt-4 border-t border-border pb-[calc(16px+env(safe-area-inset-bottom))]">
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

  /* 検索ボックス */
  .search-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--hover-bg);
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 6px 10px;
    transition: all 0.2s;
    color: var(--sidebar-muted);
  }

  .search-box:focus-within {
    border-color: var(--primary-color);
    background: var(--bg-primary);
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--sidebar-text);
    font-size: 0.85rem;
    padding: 0;
    margin: 0;
    width: 100%;
    max-width: none;
    min-width: 0;
  }

  .search-input::placeholder {
    color: var(--sidebar-muted);
  }

  .search-clear {
    background: none;
    border: none;
    color: var(--sidebar-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .search-clear:hover {
    color: var(--sidebar-text);
  }

  /* アクティブ状態（条件付きスタイル） */
  .channel-item.active {
    background: var(--primary-color);
    color: white;
  }

  .channel-item.active .channel-meta {
    color: rgba(255, 255, 255, 0.8);
  }

  .channel-item.unread {
    background: rgba(5, 150, 105, 0.06);
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-color);
    flex-shrink: 0;
  }
</style> 