<script lang="ts">
  import { goto } from "$app/navigation";
  import { parseCreated } from "$lib/app";
  import Author from "$lib/components/author.svelte";
  import Icon from "$lib/components/icons.svelte";
  import { getThreadList } from "$lib/nostr";
  import { onMount } from "svelte";
  import "websocket-polyfill";

  let threads: any[] = [];
  let loading = true;
  let showMenuButton = false;
  
  onMount(() => {
    showMenuButton = window.innerWidth < 1024;
  });

  onMount(async () => {
    threads = await getThreadList();
    loading = false;

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
    loading = true;
    threads = await getThreadList();
    loading = false;
  };

  const newThread = () => goto("/new");
</script>

<div class="home-container">
  <div class="home-header">
    <div class="header-title-section">
      {#if showMenuButton}
        <button class="menu-btn" on:click={() => {
          const chatArea = document.querySelector('.chat-container');
          if (chatArea) {
            chatArea.dispatchEvent(new CustomEvent('toggleSidebar', { bubbles: true }));
          }
        }}>
          <Icon name="menu" size={18} />
        </button>
      {/if}
      <div class="title-content">
        <h1>ホーム</h1>
        <p class="subtitle">Nostrチャンネルの一覧</p>
      </div>
    </div>
  </div>

  <div class="home-content">
    {#if loading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>チャンネル一覧を読み込み中...</p>
      </div>
    {:else}
      <div class="welcome-section">
        <h2>ようこそ Noscord へ</h2>
        <p>Nostrプロトコルを使用したパブリックチャットクライアントです。<br>
        左側のサイドバーからチャンネルを選択してチャットを開始しましょう。</p>
        
        <div class="action-buttons">
          <button class="primary-btn" on:click={newThread}>
            <Icon name="plus" size={16} />
            <span>新しいチャンネルを作成</span>
          </button>
          <button class="secondary-btn" on:click={reload}>
            <Icon name="refresh" size={16} />
            <span>チャンネル一覧を更新</span>
          </button>
        </div>
      </div>

      <div class="recent-channels">
        <h3>最近のアクティビティ</h3>
        {#if threads.length > 0}
          <div class="channel-grid">
            {#each threads.slice(0, 6) as thread}
              <div class="channel-card" on:click={() => goto(`/${thread.id}`)}>
                <div class="channel-header">
                  <h4>{thread.name !== "" ? thread.name : "無題のチャンネル"}</h4>
                </div>
                <div class="channel-preview">
                  {#if thread.events.length > 0}
                    {#each thread.events.slice(-2) as event}
                      <div class="preview-message">
                        <span class="user-badge" style="background-color: #{event.pubkey.slice(0, 6)}44">
                          {event.pubkey.slice(0, 6)}
                        </span>
                        <span class="message-text">{event.content}</span>
                      </div>
                    {/each}
                  {:else}
                    <div class="no-messages">メッセージはありません</div>
                  {/if}
                </div>
                <div class="channel-footer">
                  <Author hex={thread.author} />
                  <span class="last-update">{parseCreated(thread.latest_update)}</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="no-channels">
            <p>まだチャンネルがありません。最初のチャンネルを作成してみましょう！</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .home-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
    background: var(--chat-bg);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .home-header {
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

  .home-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 4px 0;
    color: var(--text-color);
  }

  .subtitle {
    color: var(--secondary-text);
    margin: 0;
    font-size: 0.9rem;
  }

  .home-content {
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

  .welcome-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 32px;
    margin-bottom: 32px;
    text-align: center;
  }

  .welcome-section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary-text);
    margin: 0 0 16px 0;
  }

  .welcome-section p {
    color: var(--secondary-text);
    line-height: 1.6;
    margin: 0 0 24px 0;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .primary-btn, .secondary-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .primary-btn {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  }

  .primary-btn:hover {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
  }

  .secondary-btn {
    background: transparent;
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .secondary-btn:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
  }

  .recent-channels {
    margin-top: 32px;
  }

  .recent-channels h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-text);
    margin: 0 0 20px 0;
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .channel-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .channel-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color);
  }

  .channel-header h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary-text);
    margin: 0 0 12px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .channel-preview {
    margin-bottom: 12px;
    min-height: 60px;
  }

  .preview-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 0.85rem;
  }

  .user-badge {
    background: var(--primary-color);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    flex-shrink: 0;
  }

  .message-text {
    color: var(--text-color);
    opacity: 0.75;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .no-messages {
    color: var(--secondary-text);
    font-size: 0.85rem;
    font-style: italic;
  }

  .channel-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--secondary-text);
    border-top: 1px solid var(--border-color);
    padding-top: 12px;
  }

  .last-update {
    font-size: 0.75rem;
  }

  .no-channels {
    text-align: center;
    padding: 40px 20px;
    color: var(--secondary-text);
  }

  /* レスポンシブ対応 */
  @media (max-width: 767px) {
    .home-header {
      padding: 12px 16px;
    }

    .home-header h1 {
      font-size: 1.3rem;
    }

    .home-content {
      padding: 16px;
    }

    .welcome-section {
      padding: 24px 20px;
      margin-bottom: 24px;
    }

    .welcome-section h2 {
      font-size: 1.3rem;
    }

    .channel-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .action-buttons {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .channel-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
