<script lang="ts">
  import { goto } from "$app/navigation";
  import { parseCreated } from "$lib/app";
  import Author from "$lib/components/author.svelte";
  import Icon from "$lib/components/icons.svelte";
  import { getThreadList } from "$lib/nostr";
  import { settingsModal } from "$lib/store";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "websocket-polyfill";

  export let isOpen = false;

  let threads: any[] = [];
  let loading = true;
  
  onMount(async () => {
    threads = await getThreadList();
    loading = false;

    return () => {
      // cleanup
    };
  });

  const reload = async () => {
    loading = true;
    threads = await getThreadList();
    loading = false;
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
    <button class="settings-btn" on:click={() => settingsModal.set(true)}>
      <Icon name="gear" size={18} />
      <span>設定</span>
    </button>
  </div>
</div>

{#if isOpen && typeof window !== 'undefined' && window.innerWidth < 1024}
  <div class="sidebar-overlay" on:click={() => isOpen = false}></div>
{/if}



<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: -300px;
    width: 300px;
    height: 100vh;
    background: var(--sidebar-bg, #1a1d21);
    color: var(--sidebar-text, #fff);
    z-index: 1000;
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color, #333);
  }

  .sidebar.open {
    transform: translateX(300px);
  }

  @media (min-width: 1024px) {
    .sidebar {
      position: relative;
      left: 0;
      transform: none;
    }
    
    .sidebar.open {
      transform: none;
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
    color: var(--sidebar-muted, #b3b3b3);
    margin: 0;
  }

  .section-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--sidebar-muted, #b3b3b3);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .icon-btn:hover {
    background: var(--hover-bg, #2a2d31);
  }

  .loading {
    padding: 16px 20px;
    text-align: center;
    color: var(--sidebar-muted, #b3b3b3);
    font-size: 0.9rem;
  }

  .channel-list {
    padding: 0 8px;
  }

  .channel-item {
    width: 100%;
    background: none;
    border: none;
    color: var(--sidebar-text, #fff);
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 2px;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background-color 0.2s;
    font-size: 0.9rem;
  }

  .channel-item:hover {
    background: var(--hover-bg, #2a2d31);
  }

  .channel-item.active {
    background: var(--active-bg, #059669);
    color: white;
  }

  .channel-item.active .channel-name {
    color: white;
    font-weight: 600;
  }

  .channel-item.active .channel-meta {
    color: rgba(255, 255, 255, 0.8);
  }

  .channel-item:hover:not(.active) {
    background: var(--hover-bg, #42464d);
  }

  .channel-info {
    flex: 1;
    min-width: 0;
  }

  .channel-name {
    font-weight: 500;
    color: var(--text-color, #dcddde);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .channel-meta {
    font-size: 0.8rem;
    color: var(--muted-text, #72767d);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .message-count {
    background: var(--badge-bg, #059669);
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
  }

  .new-channel-section {
    padding: 16px;
    border-top: 1px solid var(--border-color, #42464d);
  }

  .new-channel-button {
    width: 100%;
    background: none;
    border: 2px dashed var(--border-color, #42464d);
    color: var(--muted-text, #72767d);
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .new-channel-button:hover {
    border-color: var(--primary-color, #059669);
    color: var(--primary-color, #059669);
    background: rgba(5, 150, 105, 0.05);
  }

  .settings-section {
    padding: 16px;
    border-top: 1px solid var(--border-color, #42464d);
    margin-top: auto;
  }

  .settings-button {
    width: 100%;
    background: var(--primary-color, #059669);
    color: white;
    border: none;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .settings-button:hover {
    background: var(--primary-color-hover, #047857);
    transform: translateY(-1px);
  }

  /* モバイル対応 */
  @media (max-width: 1023px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1000;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }

    .sidebar.open {
      transform: translateX(0);
    }
  }

  .user-info {
    padding: 12px 16px;
    border-top: 1px solid var(--border-color, #42464d);
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--user-info-bg, #2f3136);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary-color, #059669);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .user-details {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color, #dcddde);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-status {
    font-size: 0.8rem;
    color: var(--muted-text, #72767d);
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--online-color, #059669);
    display: inline-block;
    margin-right: 4px;
  }

  .offline .status-indicator {
    background: var(--offline-color, #72767d);
  }

  .loading-channels {
    padding: 20px;
    text-align: center;
    color: var(--muted-text, #72767d);
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color, #42464d);
    border-top: 2px solid var(--primary-color, #059669);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 8px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    padding: 16px;
    text-align: center;
    color: var(--error-color, #f87171);
    font-size: 0.9rem;
  }

  .retry-button {
    background: var(--primary-color, #059669);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    margin-top: 8px;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background: var(--primary-color-hover, #047857);
  }

  .sidebar-footer {
    padding: 16px 8px;
    border-top: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .settings-btn {
    width: 100%;
    background: none;
    border: none;
    color: var(--sidebar-text, #fff);
    cursor: pointer;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }

  .settings-btn:hover {
    background: var(--hover-bg, #2a2d31);
  }

  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1500;
  }

  .settings-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--modal-bg, #ffffff);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 1501;
    max-height: 80vh;
    max-width: 500px;
    width: calc(100vw - 32px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .settings-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
    flex-shrink: 0;
  }

  .settings-modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .close-button {
    background: none;
    border: none;
    color: var(--secondary-text, #6c757d);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: var(--hover-bg, #f8f9fa);
  }

  .settings-modal-content {
    padding: 0;
    overflow-y: auto;
    flex: 1;
    max-height: 60vh;
  }

  .settings-content {
    padding: 24px;
  }

  .settings-section {
    margin-bottom: 32px;
    padding-bottom: 32px;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
  }

  .settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .settings-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .settings-section-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .section-description {
    margin: 0 0 24px 0;
    color: var(--secondary-text, #6c757d);
    line-height: 1.5;
  }

  .settings-form {
    margin-bottom: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-color, #1a1d21);
    font-size: 0.9rem;
  }

  .form-textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #1a1d21);
    font-size: 0.9rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    resize: vertical;
    min-height: 80px;
    transition: border-color 0.2s;
  }

  .form-textarea:focus {
    outline: none;
    border-color: var(--primary-color, #059669);
  }

  .form-help {
    margin: 8px 0 0 0;
    font-size: 0.8rem;
    color: var(--secondary-text, #6c757d);
  }

  .form-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn-primary, .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--primary-color, #059669);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-color-hover, #047857);
  }

  .btn-secondary {
    background: var(--secondary-bg, #f8f9fa);
    color: var(--text-color, #1a1d21);
    border: 1px solid var(--border-color, #e3e5e8);
  }

  .btn-secondary:hover {
    background: var(--hover-bg, #e9ecef);
  }

  .warning-box {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: var(--warning-bg, #fff3cd);
    border: 1px solid var(--warning-border, #ffeaa7);
    border-radius: 8px;
    color: var(--warning-text, #856404);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .about-section {
    margin-bottom: 32px;
  }

  .about-section:last-child {
    margin-bottom: 0;
  }

  .about-section h4 {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--info-bg, #f8f9fa);
    border-radius: 6px;
  }

  .info-label {
    font-weight: 500;
    color: var(--secondary-text, #6c757d);
  }

  .info-value {
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .feature-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-color, #1a1d21);
  }

  .feature-list li {
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .link-group {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .external-link {
    color: var(--primary-color, #059669);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .external-link:hover {
    color: var(--primary-color-hover, #047857);
    text-decoration: underline;
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
  }

  .settings-item {
    margin-bottom: 8px;
  }

  .settings-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: var(--text-color, #1a1d21);
    text-decoration: none;
    border-radius: 8px;
    transition: background-color 0.2s;
    width: 100%;
  }

  .settings-link:hover {
    background: var(--hover-bg, #f8f9fa);
    text-decoration: none;
  }

  .settings-item-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .settings-item-title {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .settings-item-desc {
    font-size: 0.8rem;
    color: var(--secondary-text, #6c757d);
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  @media (prefers-color-scheme: light) {
    .sidebar {
      --sidebar-bg: #f8f9fa;
      --sidebar-text: #1a1d21;
      --sidebar-muted: #6c757d;
      --border-color: #dee2e6;
      --hover-bg: #e9ecef;
      --active-bg: #007bff;
      --notification-bg: #dc3545;
    }
  }

  @media (prefers-color-scheme: dark) {
    .settings-modal {
      --modal-bg: #36393f;
      --text-color: #dcddde;
      --secondary-text: #b9bbbe;
      --border-color: #42464d;
      --hover-bg: #42464d;
      --input-bg: #40444b;
      --secondary-bg: #42464d;
      --active-tab-bg: #42464d;
      --info-bg: #42464d;
      --warning-bg: #664d03;
      --warning-border: #997404;
      --warning-text: #ffda6a;
    }

    .close-button:hover {
      background: var(--hover-bg, #42464d);
    }

    .tab-button.active {
      background: var(--active-tab-bg, #42464d);
    }

    .btn-secondary:hover {
      background: var(--hover-bg, #4a4e55);
    }
  }
</style> 