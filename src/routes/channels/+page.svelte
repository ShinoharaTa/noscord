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

<div class="channels-container">
  <div class="channels-header">
    <div class="header-title-section">
      {#if showMenuButton}
        <button class="menu-btn" on:click={openSidebar}>
          <Icon name="menu" size={18} />
        </button>
      {/if}
      <div class="title-content">
        <h1>チャンネル一覧</h1>
      </div>
    </div>
    
    <!-- フィルター設定 -->
    <div class="filter-section">
      <div class="filter-group">
        <label for="sort-select">並び順:</label>
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
      
      <div class="filter-group">
        <label for="limit-select">表示件数:</label>
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
        class="reload-btn" 
        on:click={fetchChannels}
        disabled={loading}
        title="リロード"
      >
        <Icon name="refresh" size={16} />
        {#if loading}読み込み中{:else}更新{/if}
      </button>
    </div>
  </div>

  <div class="channels-content">
    {#if loading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>チャンネル一覧を読み込み中...</p>
      </div>
    {:else if channels.length === 0}
      <div class="empty-state">
        <p>チャンネルが見つかりませんでした。</p>
      </div>
    {:else}
      <div class="results-info">
        <p>{channels.length}件のチャンネルが見つかりました</p>
      </div>
      <div class="channel-list">
        {#each channels as channel}
          <div 
            class="channel-item" 
            on:click={() => goto(`/${channel.id}`)}
            style="--accent-color: hsl({(channel.author ? parseInt(channel.author.slice(-6), 16) % 360 : 200)}, 65%, 55%)"
          >
            <div class="channel-accent-bar"></div>
            <div class="channel-content">
              <div class="channel-info">
                <div class="channel-name">
                  {channel.name !== "" ? channel.name : "無題のチャンネル"}
                </div>
                <div class="channel-meta">
                  {#if channel.author}
                    <span class="author">
                      {channel.author.slice(0, 8)}...
                    </span>
                  {/if}
                  {#if channel.latest_update}
                    <span class="last-update">
                      {parseCreated(channel.latest_update)}
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
.channels-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  background: var(--chat-bg);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.channels-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--chat-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 16px 24px;
  margin-bottom: 0;
}

.header-title-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.menu-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4px;
}
.menu-btn:hover {
  background: var(--hover-bg);
}

.title-content {
  flex: 1;
}
.channels-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-color);
}

.filter-section {
  display: flex;
  align-items: stretch;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.filter-group label {
  font-size: 0.85rem;
  color: var(--secondary-text);
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
}

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

.reload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  height: 40px;
  min-width: 100px;
  white-space: nowrap;
  transition: all 0.2s;
  margin-top: 18px;
  align-self: flex-end;
}

.reload-btn:hover:not(:disabled) {
  background: var(--primary-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.reload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.channels-content {
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-color);
}

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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--secondary-text);
}

.results-info {
  margin-bottom: 16px;
  color: var(--secondary-text);
  font-size: 0.9rem;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
}

.channel-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.channel-item:hover {
  background: var(--hover-bg);
}

.channel-accent-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-color);
}

.channel-content {
  padding: 16px 20px;
  margin-left: 3px;
}

.channel-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.channel-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
  line-height: 1.2;
}

.channel-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--secondary-text);
}

.author,
.last-update {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.channel-actions {
  flex-shrink: 0;
  color: var(--secondary-text);
  opacity: 0.6;
  transition: opacity 0.2s;
}

.channel-item:hover .channel-actions {
  opacity: 1;
  color: var(--accent-color);
}

@media (max-width: 767px) {
  .channels-header {
    padding: 8px 16px;
  }
  
  .header-title-section {
    margin-bottom: 8px;
  }
  
  .channels-header h1 {
    font-size: 1.3rem;
  }
  
  .filter-section {
    padding: 6px 0;
  }
  
  .channels-content {
    padding: 16px;
  }
  
  .channel-content {
    padding: 12px 16px;
  }
}
</style> 