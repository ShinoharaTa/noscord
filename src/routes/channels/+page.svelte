<script lang="ts">
  import { onMount } from "svelte";
  import { apiChannelList, apiChannelLoading, loadApiChannelList, refreshApiChannelList } from "$lib/store";
  import { goto } from "$app/navigation";
  import { parseCreated } from "$lib/app";
  import Icon from "$lib/components/icons.svelte";
  import { page } from "$app/stores";

  let channels = [];
  let loading = false;
  let showMenuButton = false;
  
  // フィルター設定
  let selectedSort: 'latest' | 'oldest' | 'created_new' | 'created_old' = 'latest';
  let selectedLimit = 50;
  let isFilterExpanded = false;

  $: channels = $apiChannelList;
  $: loading = $apiChannelLoading;

  // URLクエリパラメータの読み込み
  function loadFromUrl() {
    const urlParams = $page.url.searchParams;
    selectedSort = (urlParams.get('sort') as any) || 'latest';
    selectedLimit = parseInt(urlParams.get('limit') || '50');
  }

  // URLクエリパラメータの更新
  function updateUrl() {
    const params = new URLSearchParams();
    params.set('sort', selectedSort);
    params.set('limit', selectedLimit.toString());
    
    const newUrl = `/channels?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  // データの取得
  async function fetchChannels() {
    await loadApiChannelList(selectedSort, selectedLimit, true);
  }

  onMount(() => {
    loadFromUrl();
    fetchChannels();
    
    const updateMenuButton = () => {
      showMenuButton = window.innerWidth < 1024;
    };
    updateMenuButton();
    window.addEventListener('resize', updateMenuButton);
    return () => {
      window.removeEventListener('resize', updateMenuButton);
    };
  });

  // フィルター変更時の処理
  async function handleFilterChange() {
    updateUrl();
    await fetchChannels();
  }

  function openSidebar() {
    const chatArea = document.querySelector('.chat-container');
    if (chatArea) {
      chatArea.dispatchEvent(new CustomEvent('toggleSidebar', { bubbles: true }));
    }
  }

  // ソートオプション
  const sortOptions = [
    { value: 'latest', label: '最新アクティビティ順' },
    { value: 'oldest', label: '古いアクティビティ順' },
    { value: 'created_new', label: '作成日時（新しい順）' },
    { value: 'created_old', label: '作成日時（古い順）' }
  ];

  // リミットオプション
  const limitOptions = [20, 50, 100];

  // 現在の設定のラベルを取得
  function getCurrentSortLabel() {
    return sortOptions.find(option => option.value === selectedSort)?.label || '';
  }
</script>

<div class="flex-1 overflow-y-auto overflow-x-hidden p-0 bg-surface-chat w-full max-w-full box-border">
  <div class="sticky top-0 z-10 bg-surface-chat border-b border-border py-2 px-4 mb-0 md:py-4 md:px-6">
    <div class="flex items-start gap-3 mb-2 md:mb-4">
      {#if showMenuButton}
        <button class="bg-transparent border-none text-foreground cursor-pointer p-2 rounded-md transition-colors flex items-center justify-center shrink-0 mt-1 hover:bg-surface-hover" on:click={openSidebar}>
          <Icon name="menu" size={18} />
        </button>
      {/if}
      <div class="flex-1">
        <h1 class="text-xl md:text-2xl font-bold m-0 text-foreground">チャンネル一覧</h1>
      </div>
    </div>
    
    <!-- フィルター設定 -->
    <div class="flex items-stretch gap-4 flex-wrap py-1.5 md:py-3">
      <div class="flex flex-col gap-1 min-w-[140px]">
        <label for="sort-select" class="text-sm text-foreground-secondary font-medium mb-0.5 whitespace-nowrap">並び順:</label>
        <select 
          id="sort-select" 
          bind:value={selectedSort} 
          on:change={handleFilterChange}
          class="filter-select"
        >
          {#each sortOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      
      <div class="flex flex-col gap-1 min-w-[140px]">
        <label for="limit-select" class="text-sm text-foreground-secondary font-medium mb-0.5 whitespace-nowrap">表示件数:</label>
        <select 
          id="limit-select" 
          bind:value={selectedLimit} 
          on:change={handleFilterChange}
          class="filter-select"
        >
          {#each limitOptions as limit}
            <option value={limit}>{limit}件</option>
          {/each}
        </select>
      </div>
      
      <button 
        class="reload-btn flex items-center justify-center gap-1.5 px-5 bg-accent text-white border-none rounded-md cursor-pointer text-sm font-medium h-10 min-w-[100px] whitespace-nowrap transition-all mt-[18px] self-end disabled:opacity-60 disabled:cursor-not-allowed" 
        on:click={fetchChannels}
        disabled={loading}
        title="リロード"
      >
        <Icon name="refresh" size={16} />
        {#if loading}読み込み中{:else}更新{/if}
      </button>
    </div>
  </div>

  <div class="max-w-[1000px] w-full mx-auto p-4 md:p-6">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-[60px] px-5 text-center text-foreground">
        <div class="loading-spinner"></div>
        <p>チャンネル一覧を読み込み中...</p>
      </div>
    {:else if channels.length === 0}
      <div class="text-center py-[60px] px-5 text-foreground-secondary">
        <p>チャンネルが見つかりませんでした。</p>
      </div>
    {:else}
      <div class="mb-4 text-foreground-secondary text-sm">
        <p>{channels.length}件のチャンネルが見つかりました</p>
      </div>
      <div class="flex flex-col gap-2 p-0 m-0">
        {#each channels as channel}
          <button
            type="button"
            class="flex flex-col items-stretch bg-surface-alt rounded-md p-0 cursor-pointer transition-all relative overflow-hidden border-none w-full text-left hover:bg-surface-hover"
            on:click={() => goto(`/${channel.id}`)}
            style="--accent-hue: {(channel.author ? parseInt(channel.author.slice(-6), 16) % 360 : 200)}"
          >
            <div class="channel-accent-bar"></div>
            <div class="py-4 px-5 ml-[3px] max-md:py-3 max-md:px-4">
              <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                <div class="font-semibold text-base text-foreground overflow-hidden text-ellipsis whitespace-nowrap m-0 leading-tight">
                  {channel.name !== "" ? channel.name : "無題のチャンネル"}
                </div>
                <div class="flex items-center gap-3 text-sm text-foreground-secondary">
                  {#if channel.author}
                    <span class="text-sm text-foreground-secondary">
                      {channel.author.slice(0, 8)}...
                    </span>
                  {/if}
                  {#if channel.latest_update}
                    <span class="text-sm text-foreground-secondary">
                      {parseCreated(channel.latest_update)}
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* カスタム select スタイル */
  .filter-select {
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-color);
    font-size: 0.9rem;
    height: 40px;
    min-width: 140px;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
    background-position: right 10px center;
    background-repeat: no-repeat;
    background-size: 16px;
    padding-right: 36px;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
  }

  .filter-select:hover {
    border-color: var(--primary-color);
  }

  /* アクセントバー（CSS custom property 使用） */
  .channel-accent-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: hsl(var(--accent-hue, 200), 65%, 55%);
  }

  @media (prefers-color-scheme: dark) {
    .channel-accent-bar {
      background: hsl(var(--accent-hue, 200), 65%, 65%);
    }
  }

  /* リロードボタンのホバーエフェクト */
  .reload-btn:hover:not(:disabled) {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
  }

  /* ローディングスピナー */
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
</style> 