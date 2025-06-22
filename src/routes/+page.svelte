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
    padding: 24px;
    background: var(--chat-bg, #ffffff);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .home-header {
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
  }

  .header-title-section {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .menu-btn {
    background: none;
    border: none;
    color: var(--text-color, #1a1d21);
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
    background: var(--hover-bg, #f8f9fa);
  }

  @media (prefers-color-scheme: dark) {
    .menu-btn {
      color: var(--text-color, #dcddde);
    }

    .menu-btn:hover {
      background: var(--hover-bg, #42464d);
    }
  }

  .title-content {
    flex: 1;
  }

  .home-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: var(--primary-text, #1a1d21);
  }

  .subtitle {
    color: var(--secondary-text, #6c757d);
    margin: 0;
    font-size: 1rem;
  }

  .home-content {
    max-width: 1000px;
    width: 100%;
    box-sizing: border-box;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color, #e3e5e8);
    border-top: 3px solid var(--primary-color, #059669);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .welcome-section {
    background: linear-gradient(135deg, var(--primary-color, #059669) 0%, var(--primary-color-dark, #047857) 100%);
    color: white;
    padding: 40px;
    border-radius: 12px;
    margin-bottom: 32px;
    text-align: center;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .welcome-section h2 {
    font-size: 1.8rem;
    font-weight: 600;
    margin: 0 0 16px 0;
  }

  .welcome-section p {
    font-size: 1.1rem;
    margin: 0 0 24px 0;
    opacity: 0.9;
    line-height: 1.6;
  }

  .action-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .primary-btn, .secondary-btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .primary-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
  }

  .primary-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .secondary-btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    backdrop-filter: blur(10px);
  }

  .secondary-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .recent-channels {
    margin-bottom: 32px;
  }

  .recent-channels h3 {
    font-size: 1.4rem;
    font-weight: 600;
    margin: 0 0 20px 0;
    color: var(--primary-text, #1a1d21);
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .channel-card {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .channel-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: var(--primary-color, #059669);
  }

  .channel-header {
    margin-bottom: 12px;
  }

  .channel-header h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--primary-text, #1a1d21);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .channel-preview {
    margin-bottom: 16px;
    min-height: 60px;
  }

  .preview-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 0.9rem;
  }

  .user-badge {
    background: var(--user-badge-bg, #e3e5e8);
    color: var(--user-badge-text, #1a1d21);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .message-text {
    color: var(--secondary-text, #6c757d);
    line-height: 1.4;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .no-messages {
    color: var(--muted-text, #adb5bd);
    font-style: italic;
    text-align: center;
    padding: 20px 0;
  }

  .channel-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--secondary-text, #6c757d);
    padding-top: 12px;
    border-top: 1px solid var(--border-color, #e3e5e8);
  }

  .last-update {
    font-size: 0.75rem;
  }

  .no-channels {
    text-align: center;
    padding: 60px 20px;
    color: var(--secondary-text, #6c757d);
  }

  .no-channels p {
    font-size: 1.1rem;
    margin: 0;
  }

  @media (max-width: 768px) {
    .home-container {
      padding: 16px;
      overflow-x: hidden;
    }

    .home-header {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }

    .home-header h1 {
      font-size: 1.5rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .home-content {
      width: 100%;
      max-width: 100%;
    }

    .welcome-section {
      padding: 20px;
      margin-left: 0;
      margin-right: 0;
      width: 100%;
      max-width: 100%;
    }

    .welcome-section h2 {
      font-size: 1.4rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .welcome-section p {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .action-buttons {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }

    .primary-btn, .secondary-btn {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .channel-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      width: 100%;
      max-width: 100%;
      gap: 16px;
    }

    .channel-card {
      padding: 16px;
      margin: 0;
      width: 100%;
      max-width: 100%;
    }

    .channel-header h4 {
      font-size: 1rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }

    .message-text {
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .user-badge {
      flex-shrink: 0;
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .last-update {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
  }

  @media (max-width: 480px) {
    .channel-grid {
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 0;
    }

    .channel-card {
      padding: 12px;
      border-radius: 8px;
    }

    .welcome-section {
      padding: 16px;
    }

    .home-container {
      padding: 12px;
    }
  }

  @media (prefers-color-scheme: dark) {
    .home-container {
      --chat-bg: #36393f;
      --primary-text: #dcddde;
      --secondary-text: #b9bbbe;
      --muted-text: #72767d;
      --border-color: #42464d;
      --card-bg: #2f3136;
    }
  }
</style>
