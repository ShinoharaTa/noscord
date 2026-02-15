<script lang="ts">
  import { goto } from "$app/navigation";
  import { parseCreated } from "$lib/app";
  import Author from "$lib/components/author.svelte";
  import Icon from "$lib/components/icons.svelte";
  import { channelList, channelLoading, refreshChannelList } from "$lib/store";
  import type { SingleThread } from "$lib/nostr";
  import { onMount } from "svelte";
  import "websocket-polyfill";

  let threads: SingleThread[] = [];
  let loading = true;
  let showMenuButton = false;
  
  // 初期ロード

  onMount(() => {
    void refreshChannelList();

    // メニューボタンの表示制御
    const updateMenuButton = () => {
      showMenuButton = window.innerWidth < 1024;
    };

    updateMenuButton();
    window.addEventListener('resize', updateMenuButton);

    return () => {
      window.removeEventListener('resize', updateMenuButton);
    };
  });

  const reload = async () => {
    await refreshChannelList();
  };

  const newThread = () => goto("/new");

  // reactive subscriptions
  $: threads = $channelList;
  $: loading = $channelLoading;
</script>

<div class="flex-1 overflow-y-auto overflow-x-hidden p-0 bg-surface-chat w-full max-w-full box-border">
  <div class="sticky top-0 z-10 bg-surface-chat border-b border-border py-3 px-4 mb-0 md:py-4 md:px-6">
    <div class="flex items-start gap-3">
      {#if showMenuButton}
        <button class="bg-transparent border-none text-foreground cursor-pointer p-2 rounded-md transition-colors flex items-center justify-center shrink-0 mt-1 hover:bg-surface-hover" on:click={() => {
          const chatArea = document.querySelector('.chat-container');
          if (chatArea) {
            chatArea.dispatchEvent(new CustomEvent('toggleSidebar', { bubbles: true }));
          }
        }}>
          <Icon name="menu" size={18} />
        </button>
      {/if}
      <div class="flex-1">
        <h1 class="text-xl md:text-2xl font-bold mb-1 text-foreground">ホーム</h1>
      </div>
    </div>
  </div>

  <div class="max-w-[1000px] w-full mx-auto p-4 md:p-6">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-[60px] px-5 text-center text-foreground">
        <div class="loading-spinner"></div>
        <p>チャンネル一覧を読み込み中...</p>
      </div>
    {:else}
      <div class="bg-surface-alt border border-border rounded-lg py-6 px-5 mb-6 text-center md:p-8 md:mb-8">
        <h2 class="text-xl md:text-2xl font-semibold text-[var(--primary-text)] mb-4">ようこそ Noscord へ</h2>
        <p class="text-foreground-secondary leading-relaxed mb-6">Nostrプロトコルを使用したパブリックチャットクライアントです。<br>
        左側のサイドバーからチャンネルを選択してチャットを開始しましょう。</p>
        
        <div class="flex gap-3 justify-center flex-wrap max-md:flex-col max-md:items-stretch">
          <button class="primary-btn flex items-center gap-2 py-3 px-5 rounded-md text-sm font-medium cursor-pointer transition-all border-none bg-accent text-white shadow-sm" on:click={newThread}>
            <Icon name="plus" size={16} />
            <span>新しいチャンネルを作成</span>
          </button>
          <button class="flex items-center gap-2 py-3 px-5 rounded-md text-sm font-medium cursor-pointer transition-all bg-transparent text-foreground border border-border hover:bg-surface-hover hover:border-accent" on:click={reload}>
            <Icon name="refresh" size={16} />
            <span>チャンネル一覧を更新</span>
          </button>
        </div>
      </div>

      <div class="mt-8">
        <h3 class="text-lg font-semibold text-[var(--primary-text)] mb-5">最近のアクティビティ</h3>
        {#if threads.length > 0}
          <div class="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {#each threads.slice(0, 6) as thread}
              <button
                type="button"
                class="channel-card flex flex-col items-stretch text-left w-full bg-surface-card border border-border rounded-md p-4 cursor-pointer transition-all shadow-sm min-w-0 overflow-hidden hover:border-accent"
                on:click={() => goto(`/${thread.id}`)}
              >
                <div>
                  <h4 class="text-base font-semibold text-[var(--primary-text)] mb-3 overflow-hidden text-ellipsis whitespace-nowrap">{thread.name !== "" ? thread.name : "無題のチャンネル"}</h4>
                </div>
                <div class="mb-3 min-h-[60px] overflow-hidden min-w-0">
                  {#if thread.events.length > 0}
                    {#each thread.events.slice(-2) as event}
                      <div class="flex items-center gap-2 mb-2 text-sm w-full min-w-0 max-md:gap-1.5 max-md:text-xs">
                        <span class="bg-accent text-white py-0.5 px-1.5 rounded-sm text-xs font-medium shrink-0 whitespace-nowrap max-md:text-[0.7rem] max-md:py-px max-md:px-1" style="background-color: #{event.pubkey.slice(0, 6)}44">
                          {event.pubkey.slice(0, 6)}
                        </span>
                        <span class="text-foreground opacity-75 leading-snug text-sm flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis max-md:text-xs">{event.content.replace(/\s+/g, ' ').trim()}</span>
                      </div>
                    {/each}
                  {:else}
                    <div class="text-foreground-secondary text-sm italic">メッセージはありません</div>
                  {/if}
                </div>
                <div class="flex justify-between items-center text-sm text-foreground-secondary border-t border-border pt-3">
                  <Author hex={thread.author} />
                  <span class="text-xs">{parseCreated(thread.latest_update)}</span>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="text-center py-10 px-5 text-foreground-secondary">
            <p>まだチャンネルがありません。最初のチャンネルを作成してみましょう！</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* アニメーション（Tailwind では表現できない） */
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* ホバー時のトランスフォーム */
  .primary-btn:hover {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
  }

  .channel-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
</style>
