<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import Modal from "$lib/components/modal.svelte";
  import Post from "$lib/components/post.svelte";
  import Icon from "$lib/components/icons.svelte";
  import {
    getChannelMeta,
    getSingleEvent,
    post,
    relays,
    req,
    checkRelayConnections,
  } from "$lib/nostr";
  import {
    getSecKey,
    modal,
    settingsModal,
  } from "$lib/store";
  import type { Nostr } from "nosvelte";
  import { Metadata, NostrApp, UniqueEventList } from "nosvelte";
  import { writable } from "svelte/store";
  import "websocket-polyfill";
  
  // リアクティブにchannel_idを取得
  $: channel_id = $page.params.channel_id;

  // 取得したイベントを時系列で並べ替える
  const sorted = (events: Nostr.Event[]) => {
    return [...events].sort((a, b) => a.created_at - b.created_at);
  };

  const limitLists = [20, 50, 100];
  const selectedLimit = writable(20);
  let channelNameLoaded = false;
  let channelName = "";
  
  let postContent = "";
  let replyId: string | null = null;
  let parentEvent: any;
  let previousChannelId: string | undefined = undefined;
  let componentKey = 0;
  let showMenuButton = false;
  let isLoggedIn = false;

  // channel_idが変更されたときにチャンネル情報を再読み込み
  const loadChannelInfo = async (id: string) => {
    if (!id) return;
    channelNameLoaded = false;
    channelName = "";
    try {
      channelName = await getChannelMeta(id);
    } catch (error) {
      channelName = "無題のチャンネル";
    } finally {
      channelNameLoaded = true;
    }
  };

  // 状態をリセットする関数
  const resetChannelState = () => {
    postContent = "";
    replyId = null;
    parentEvent = null;
    // チャンネル名の状態もリセット
    channelNameLoaded = false;
    channelName = "";
  };

  // ログイン状態をチェックする関数
  const checkLoginStatus = () => {
    const seckey = getSecKey();
    isLoggedIn = !!seckey;
  };

  // 初期化時の処理
  onMount(() => {
    if (channel_id) {
      resetChannelState();
      loadChannelInfo(channel_id);
      previousChannelId = channel_id;
    }

    // ログイン状態をチェック
    checkLoginStatus();

    // メニューボタンの表示制御
    const updateMenuButton = () => {
      showMenuButton = window.innerWidth < 1024;
    };

    updateMenuButton();
    window.addEventListener('resize', updateMenuButton);

    // ページフォーカス時にログイン状態を再チェック
    const handleFocus = () => {
      checkLoginStatus();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('resize', updateMenuButton);
      window.removeEventListener('focus', handleFocus);
    };
  });

  // channel_idの変更を監視（確実にリセットするため）
  $: if (channel_id && channel_id !== previousChannelId) {
    // コンポーネントキーを更新してUniqueEventListを強制再作成
    componentKey++;
    // 状態を確実にリセット
    resetChannelState();
    // チャンネル情報を読み込み
    loadChannelInfo(channel_id);
    // 前回のチャンネルIDを更新
    previousChannelId = channel_id;
  }

  $: submitDisabled = !postContent.trim();

  const submit = async () => {
    const seckey = getSecKey();
    if (!seckey) {
      alert("投稿するには鍵の生成または登録が必要です");
      return;
    }
    
    try {
      // リレー接続状況をチェック
      const relayStatus = await checkRelayConnections();
      const connectedRelays = Object.entries(relayStatus).filter(([_, connected]) => connected);
      
      if (connectedRelays.length === 0) {
        alert("現在利用可能なリレーがありません。しばらく待ってから再試行してください。");
        return;
      }
      
      const result = await post(postContent, channel_id, seckey, replyId);
      if (result) {
        // 投稿内容とリプライ状態をクリア
        postContent = "";
        replyId = null;
      }
    } catch (error) {
      alert(`投稿に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const submitKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "Enter") {
      submit();
    }
  };

  const openReply = async (id: string) => {
    const event = await getSingleEvent(id);
    if (!event) return;
    parentEvent = event;
    modal.set(true);
  };
</script>





<div class="chat-channel">
  {#key `nostr-app-${channel_id}-${componentKey}`}
    <NostrApp {relays}>
      {#key `${channel_id}-${componentKey}`}
      <UniqueEventList
        queryKey={["timeline", "feed", channel_id, componentKey.toString()]}
        filters={[
          {
            kinds: [42],
            limit: $selectedLimit,
            "#e": [channel_id],
          },
        ]}
        {req}
        let:events
      >

      <div slot="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>メッセージを読み込み中...</p>
      </div>
      <div slot="error" let:error class="error-container">
        <p class="error-message">エラー: {error}</p>
      </div>
      
      <!-- チャンネルヘッダー -->
      <div class="channel-header">
        <div class="channel-title-section">
          {#if showMenuButton}
            <button class="menu-btn" on:click={() => {
              // 親コンポーネントのsidebarOpenを制御
              const chatArea = document.querySelector('.chat-container');
              if (chatArea) {
                chatArea.dispatchEvent(new CustomEvent('toggleSidebar', { bubbles: true }));
              }
            }}>
              <Icon name="menu" size={18} />
            </button>
          {/if}
          <h1 class="channel-title">
            {#if channelNameLoaded}
              {channelName || "無題のチャンネル"}
            {:else}
              読み込み中...
            {/if}
          </h1>
        </div>
        <div class="channel-controls">
          <select bind:value={$selectedLimit} class="limit-selector">
            {#each limitLists as limit}
              <option value={limit}>{limit}件表示</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- メッセージエリア -->
      <div class="messages-container">
        <div class="messages-list">
          {#each sorted(events) as event (event.id)}
            <Metadata let:metadata pubkey={event.pubkey} queryKey={["user_meta", event.pubkey]} >
              <div class="message-wrapper">
                <Post
                  {event}
                  {metadata}
                  on:reply={(e) => (replyId = e.detail.id)}
                  on:openReply={(e) => openReply(e.detail.id)}
                />
              </div>
              
              <!-- メタデータ取得中の表示 -->
              <div slot="loading" class="message-wrapper">
                <Post
                  {event}
                  metadata={undefined}
                  on:reply={(e) => (replyId = e.detail.id)}
                  on:openReply={(e) => openReply(e.detail.id)}
                />
              </div>
              
              <!-- メタデータが見つからない場合の表示 -->
              <div slot="nodata" class="message-wrapper">
                <Post
                  {event}
                  metadata={undefined}
                  on:reply={(e) => (replyId = e.detail.id)}
                  on:openReply={(e) => openReply(e.detail.id)}
                />
              </div>
              
              <!-- エラー時の表示 -->
              <div slot="error" class="message-wrapper">
                <Post
                  {event}
                  metadata={undefined}
                  on:reply={(e) => (replyId = e.detail.id)}
                  on:openReply={(e) => openReply(e.detail.id)}
                />
              </div>
            </Metadata>
          {/each}
        </div>
      </div>

      <!-- メッセージ入力エリア -->
      {#key channel_id}
        <div class="input-area">
          {#if isLoggedIn}
            {#if replyId}
              <div class="reply-indicator">
                <Icon name="chat" size={16} />
                <span class="reply-text">{postContent}</span>
                <button 
                  class="reply-close" 
                  on:click={() => (replyId = null)} 
                  type="button"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            {/if}
            <div class="input-container">
              <div class="message-input">
                <textarea 
                  bind:value={postContent} 
                  on:keydown={submitKeydown} 
                  placeholder="{channelName || 'チャンネル'}にメッセージを送信"
                  class="message-input"
                  rows="1"
                ></textarea>
              </div>
              <button 
                class="send-button" 
                on:click={submit} 
                type="button" 
                disabled={submitDisabled}
              >
                <Icon name="send" size={16} />
              </button>
            </div>
          {:else}
            <div class="login-prompt">
              <div class="login-message">
                <Icon name="key" size={20} />
                <div class="login-text">
                  <h3>ログインして参加する</h3>
                  <p>メッセージを送信するには、秘密鍵の設定が必要です。</p>
                </div>
              </div>
              <button class="login-button" on:click={() => settingsModal.set(true)}>
                <Icon name="key" size={16} />
                <span>キー管理を開く</span>
              </button>
            </div>
          {/if}
        </div>
      {/key}
      </UniqueEventList>
      {/key}
    </NostrApp>
  {/key}
</div>

<style>
  .chat-channel {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--chat-bg, #ffffff);
    overflow: hidden;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .no-messages-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--secondary-text, #6c757d);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #e3e5e8);
    border-top: 3px solid var(--primary-color, #059669);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .loading-spinner::after {
    content: "";
    display: block;
    width: 20px;
    height: 20px;
    margin: 8px;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: var(--primary-color, #059669);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-container {
    padding: 40px 20px;
    text-align: center;
    color: var(--error-color, #dc3545);
  }

  .error-message {
    color: var(--error-color, #dc3545);
    font-weight: 500;
  }

  .channel-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
    background: var(--chat-bg, #ffffff);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .channel-title-section {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .menu-btn {
    background: none;
    border: none;
    color: var(--text-color, #1a1d21);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .menu-btn:hover {
    background: var(--hover-bg, #f8f9fa);
  }

  .channel-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-text, #1a1d21);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .channel-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .limit-selector {
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 4px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #1a1d21);
    padding: 6px 8px;
    font-size: 0.9rem;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
  }

  .limit-selector:focus {
    border-color: var(--primary-color, #059669);
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
  }

  .limit-selector:hover {
    border-color: var(--primary-color, #059669);
  }

  .messages-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .messages-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 24px;
    display: flex;
    flex-direction: column;
  }

  .message-wrapper {
    border-bottom: 1px solid var(--message-border, #f0f0f0);
    padding: 8px 16px;
  }

  .input-area {
    position: sticky;
    bottom: 0;
    z-index: 10;
    border-top: 1px solid var(--border-color, #e3e5e8);
    background: var(--chat-bg, #ffffff);
    padding: 16px;
  }

  .reply-indicator {
    margin-bottom: 8px;
    padding: 8px 12px;
    background: var(--reply-bg, #f8f9fa);
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 4px;
    font-size: 0.9rem;
    color: var(--secondary-text, #6c757d);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .reply-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--secondary-text, #6c757d);
  }

  .reply-close {
    background: none;
    border: none;
    color: var(--secondary-text, #6c757d);
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    margin-left: 8px;
    transition: background-color 0.2s;
  }

  .reply-close:hover {
    background: var(--hover-bg, #e9ecef);
  }

  .input-container {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .message-input {
    flex: 1;
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    padding: 12px 16px;
    font-size: 1rem;
    line-height: 1.4;
    resize: vertical;
    min-height: 44px;
    max-height: 200px;
    outline: none;
    transition: all 0.2s;
    color: var(--text-color, #1a1d21);
    font-family: inherit;
  }

  .message-input:focus {
    border-color: var(--primary-color, #059669);
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
  }

  .message-input::placeholder {
    color: var(--placeholder-color, #adb5bd);
  }

  .send-button {
    background: var(--primary-color, #059669);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 20px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  }

  .send-button:hover:not(:disabled) {
    background: var(--primary-color-hover, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
  }

  .send-button:disabled {
    background: var(--disabled-bg, #adb5bd);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .login-prompt {
    background: var(--login-prompt-bg, #f8f9fa);
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    margin: 16px;
  }

  .login-prompt h3 {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-text, #1a1d21);
  }

  .login-prompt p {
    margin: 0 0 16px 0;
    color: var(--secondary-text, #6c757d);
    line-height: 1.5;
  }

  .login-button {
    background: var(--primary-color, #059669);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  }

  .login-button:hover {
    background: var(--primary-color-hover, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
  }

  @media (max-width: 768px) {
    .channel-header {
      padding: 12px 16px;
    }

    .channel-title {
      font-size: 1.2rem;
    }

    .messages-list {
      padding: 0 16px;
    }

    .input-area {
      padding: 12px 16px;
    }

    .message-wrapper {
      margin-bottom: 12px;
      padding: 8px 0;
    }

    .input-container {
      gap: 8px;
    }

    .send-button {
      min-width: 44px;
      height: 44px;
      padding: 10px 12px;
    }

    .login-prompt {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      padding: 16px;
    }

    .login-message {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      text-align: left;
    }

    .login-button {
      align-self: stretch;
      justify-content: center;
    }
  }

  @media (prefers-color-scheme: dark) {
    .chat-channel {
      --chat-bg: #36393f;
      --primary-text: #dcddde;
      --secondary-text: #b9bbbe;
      --text-color: #dcddde;
      --border-color: #42464d;
      --input-bg: #40444b;
      --reply-bg: #42464d;
      --message-border: #42464d;
      --placeholder-color: #72767d;
      --hover-bg: #42464d;
      --disabled-bg: #72767d;
      --login-prompt-bg: #42464d;
    }
  }
</style>
