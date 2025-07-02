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

  // 日付グループ化関数
  const groupByDate = (events: Nostr.Event[]) => {
    const sortedEvents = sorted(events);
    const groups: { date: string, displayDate: string, events: Nostr.Event[] }[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const event of sortedEvents) {
      const eventDate = new Date(event.created_at * 1000);
      const dateKey = eventDate.toDateString();
      
      // 表示用の日付文字列を生成
      let displayDate: string;
      if (eventDate.toDateString() === today.toDateString()) {
        displayDate = "今日";
      } else if (eventDate.toDateString() === yesterday.toDateString()) {
        displayDate = "昨日";
      } else {
        displayDate = `${eventDate.getMonth() + 1}/${eventDate.getDate()}`;
      }

      // 既存のグループを探す
      let group = groups.find(g => g.date === dateKey);
      if (!group) {
        group = { date: dateKey, displayDate, events: [] };
        groups.push(group);
      }
      group.events.push(event);
    }

    return groups;
  };

  const limitLists = [20, 50, 100];
  const selectedLimit = writable(20);
  let channelNameLoaded = false;
  let channelName = "";
  
  let postContent = "";
  let replyId: string | null = null;
  let parentEvent: any;
  let replyToEvent: any = null;
  let previousChannelId: string | undefined = undefined;
  let componentKey = 0;
  let showMenuButton = false;
  let isLoggedIn = false;
  let textareaElement: HTMLTextAreaElement;

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
    replyToEvent = null;
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
    const handleResize = () => {
      showMenuButton = window.innerWidth < 1024;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // ページフォーカス時にログイン状態を再チェック
    const handleFocus = () => {
      checkLoginStatus();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('resize', handleResize);
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

  // textareaの初期化
  $: if (textareaElement) {
    initializeTextarea(textareaElement);
  }

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
        replyToEvent = null;
        
        // textareaの高さをリセット
        if (textareaElement) {
          textareaElement.style.height = 'auto';
          textareaElement.style.height = Math.max(textareaElement.scrollHeight, 52) + 'px';
        }
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

  // リプライIDが設定されたときにリプライ先の投稿データを取得
  const loadReplyToEvent = async (id: string) => {
    try {
      const event = await getSingleEvent(id);
      replyToEvent = event;
    } catch (error) {
      console.error("リプライ先の投稿を取得できませんでした:", error);
      replyToEvent = null;
    }
  };

  // リプライIDの変更を監視
  $: if (replyId) {
    loadReplyToEvent(replyId);
  } else {
    replyToEvent = null;
  }

  // textareaの自動リサイズ機能
  const autoResize = (event: Event) => {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      // 現在の高さを保存
      const currentHeight = textarea.style.height;
      
      // 高さを一時的にautoにしてscrollHeightを取得
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      // 適切な高さを計算（最小52px、最大160px）
      const newHeight = Math.min(Math.max(scrollHeight, 52), 160);
      
      // 高さを設定
      textarea.style.height = newHeight + 'px';
    }
  };

  // textareaの初期化
  const initializeTextarea = (textarea: HTMLTextAreaElement) => {
    if (textarea && !textarea.style.height) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.max(scrollHeight, 52) + 'px';
    }
  };

  // 投稿内容を最大3行に制限する関数
  const truncateContent = (content: string, maxLines: number = 3) => {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return content;
    }
    return lines.slice(0, maxLines).join('\n') + '...';
  };

  // 作者の表示名を取得する関数
  const getAuthorDisplayName = (event: any, metadata: any) => {
    try {
      if (metadata && metadata.content) {
        const content = JSON.parse(metadata.content);
        return content.name || content.display_name || event.pubkey.slice(0, 6);
      }
      return event.pubkey.slice(0, 6);
    } catch (error) {
      return event.pubkey.slice(0, 6);
    }
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
          {#each groupByDate(events) as group (group.date)}
            <!-- 日付セパレーター -->
            <div class="date-separator">
              <div class="date-line"></div>
              <div class="date-label">{group.displayDate}</div>
              <div class="date-line"></div>
            </div>
            
            <!-- その日の投稿一覧 -->
            <div class="posts-container">
              {#each group.events as event (event.id)}
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
          {/each}
        </div>
      </div>

      <!-- メッセージ入力エリア -->
      {#key channel_id}
        <div class="input-area">
          <div class="input-area-inner">
            {#if isLoggedIn}
              {#if replyId}
                <div class="reply-indicator">
                  <div class="reply-header">
                    <Icon name="reply" size={16} />
                    <span class="reply-label">
                      リプライ先：
                      {#if replyToEvent}
                        <Metadata pubkey={replyToEvent.pubkey} queryKey={["user_meta", replyToEvent.pubkey]} let:metadata>
                          {getAuthorDisplayName(replyToEvent, metadata)}
                        </Metadata>
                      {:else}
                        読み込み中...
                      {/if}
                    </span>
                    <button 
                      class="reply-close" 
                      on:click={() => (replyId = null)} 
                      type="button"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                  {#if replyToEvent}
                    <div class="reply-content">
                      <div class="reply-message">
                        {truncateContent(replyToEvent.content)}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
              <div class="input-container">
                <textarea 
                  bind:value={postContent} 
                  bind:this={textareaElement}
                  on:keydown={submitKeydown}
                  on:input={autoResize}
                  placeholder="メッセージを送信"
                  class="message-input"
                  rows="1"
                ></textarea>
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
                  <p>メッセージ送信にはログインが必要です</p>
                </div>
                <button class="login-button" on:click={() => settingsModal.set(true)}>
                  <Icon name="key" size={16} />
                  <span>ログインする</span>
                </button>
              </div>
            {/if}
          </div>
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
    background: var(--chat-bg);
    overflow: hidden;
    position: relative;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--secondary-text);
  }

  .no-messages-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--secondary-text);
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

  .loading-spinner::after {
    content: "";
    display: block;
    width: 20px;
    height: 20px;
    margin: 8px;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: var(--primary-color);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-container {
    padding: 40px 20px;
    text-align: center;
    color: var(--error-color);
  }

  .error-message {
    color: var(--error-color);
    font-weight: 500;
  }

  .channel-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--border-color);
    background: var(--chat-bg);
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
    color: var(--text-color);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .menu-btn:hover {
    background: var(--hover-bg);
  }

  .channel-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-text);
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
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-color);
    padding: 6px 8px;
    font-size: 0.9rem;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
  }

  .limit-selector:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color-alpha);
  }

  .limit-selector:hover {
    border-color: var(--primary-color);
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
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .posts-container {
    width: 100%;
    padding: 0 16px;
  }

  @media (min-width: 768px) {
    .posts-container {
      padding: 0 24px;
    }
  }

  .message-wrapper {
    margin-bottom: 8px;
  }

  /* 日付セパレーターのスタイル */
  .date-separator {
    display: flex;
    align-items: center;
    margin: 20px 0 12px 0;
    gap: 12px;
  }

  .date-line {
    flex: 1;
    height: 1px;
    background: var(--border-color);
  }

  .date-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--secondary-text);
    background: var(--chat-bg);
    padding: 0 8px;
    white-space: nowrap;
  }

  .input-area {
    position: sticky;
    bottom: 0;
    z-index: 10;
    border-top: 1px solid var(--border-color);
    background: var(--chat-bg);
    padding: 16px 0;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
    width: 100%;
  }

  .input-area-inner {
    width: 100%;
    padding: 0 24px;
    box-sizing: border-box;
  }

  /* 非常に大きな画面での可読性向上 */
  @media (min-width: 1600px) {
    .input-area-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 48px;
    }
    
    .posts-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 48px;
    }
  }

  .reply-indicator {
    margin-bottom: 8px;
    padding: 8px 12px;
    background: var(--reply-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    color: var(--secondary-text);
  }

  .reply-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .reply-label {
    flex: 1;
    font-weight: 500;
    color: var(--secondary-text);
  }

  .reply-label :global(*) {
    color: var(--primary-color);
    font-weight: 600;
  }

  .reply-content {
    padding-left: 24px;
  }

  .reply-message {
    color: var(--text-color);
    font-size: 0.85rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    }

  .reply-close {
    background: none;
    border: none;
    color: var(--secondary-text);
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    margin-left: 8px;
    transition: background-color 0.2s;
  }

  .reply-close:hover {
    background: var(--hover-bg);
  }

  .input-container {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .message-input {
    flex: 1;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--input-bg);
    padding: 14px 16px;
    font-size: 1rem;
    line-height: 1.5;
    resize: none;
    min-height: 52px;
    max-height: 160px;
    outline: none;
    transition: all 0.2s;
    color: var(--text-color);
    font-family: inherit;
    width: 100%;
    max-width: none; /* グローバルスタイルのmax-width: 600pxを無効化 */
    box-sizing: border-box;
    overflow-y: auto;
  }

  .message-input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-alpha);
  }

  .message-input::placeholder {
    color: var(--placeholder-color);
  }

  .send-button {
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 14px 24px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 52px;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  }

  .send-button:hover:not(:disabled) {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
  }

  .send-button:disabled {
    background: var(--disabled-bg);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .login-prompt {
    background: var(--login-prompt-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 600px;
    margin: 0 auto;
  }

  .login-message {
    flex: 1;
  }

  .login-prompt p {
    margin: 0;
    color: var(--secondary-text);
    line-height: 1.4;
    font-size: 0.9rem;
  }

  .login-button {
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .login-button:hover {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
  }

  @media (max-width: 767px) {
    .channel-header {
      padding: 12px 16px;
    }

    .channel-title {
      font-size: 1.1rem;
    }

    .posts-container {
      padding: 0 12px;
    }

    .input-area {
      padding: 12px 0;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
    }

    .input-area-inner {
      padding: 0 12px;
    }

    .input-container {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .send-button {
      width: 100%;
      height: 48px;
      padding: 12px 16px;
      justify-content: center;
      font-size: 1rem;
    }

    .message-input {
      min-height: 60px;
      padding: 12px 16px;
      font-size: 1rem;
    }

    .reply-indicator {
      margin: 0 0 12px 0;
      padding: 8px 12px;
    }

    .reply-content {
      padding-left: 20px;
    }

    .login-prompt {
      padding: 12px 16px;
      max-width: none;
      margin: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      text-align: center;
    }

    .login-message {
      flex: none;
    }

    .login-prompt p {
      font-size: 0.85rem;
      margin: 0;
      line-height: 1.4;
    }

    .login-message {
      text-align: center;
      margin-bottom: 12px;
    }

    .login-button {
      width: 100%;
      justify-content: center;
      padding: 12px 16px;
      font-size: 0.95rem;
    }
  }

  /* ダークモード対応は不要（CSS変数で自動対応） */
</style>
