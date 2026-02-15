<script lang="ts">
  import { page } from "$app/stores";
  import { onMount, afterUpdate } from "svelte";
  import Modal from "$lib/components/modal.svelte";
  import Post from "$lib/components/post.svelte";
  import Icon from "$lib/components/icons.svelte";
  import {
    getChannelMeta,
    getSingleEvent,
    post,
    postWithNip07,
    relays,
    req,
    checkRelayConnections,
  } from "$lib/nostr";
  import { finalizeEvent } from "nostr-tools";
  import { hexToBytes } from "@noble/hashes/utils.js";
  import {
    getSecKey,
    modal,
    settingsModal,
    getUseNip07,
    nip07Available,
  } from "$lib/store";
  import type { Nostr } from "nosvelte";
  import { Metadata, NostrApp, UniqueEventList } from "nosvelte";
  import { writable } from "svelte/store";
  import "websocket-polyfill";
  
  // リアクティブにchannel_idを取得
  $: channel_id = $page.params.channel_id ?? "";

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
  let selectedImages: File[] = [];
  let imagePreviewUrls: string[] = [];
  let isUploading = false;
  let uploadProgress = "";
  let replyId: string | null = null;
  let parentEvent: any;
  let replyToEvent: any = null;
  let previousChannelId: string | undefined = undefined;
  let componentKey = 0;
  let showMenuButton = false;

  let isLoggedIn = false;
  let textareaElement: HTMLTextAreaElement;
  let messagesContainer: HTMLElement; // メッセージコンテナの参照
  let shouldScrollToBottom = true; // 一番下までスクロールするかどうかのフラグ
  let previousEventCount = 0; // 前回のイベント数
  let isInitialLoad = true; // 初回ロードかどうか
  let isUserScrolling = false; // ユーザーがスクロール中かどうか
  let scrollTimeout: number; // スクロール終了を検知するためのタイマー

  // 一番下までスクロールする関数
  const scrollToBottom = () => {
    if (messagesContainer && shouldScrollToBottom && !isUserScrolling) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50); // DOM更新後にスクロール
    }
  };

  // ユーザーがスクロールした時に自動スクロールを停止/再開
  const handleScroll = () => {
    if (!messagesContainer) return;
    
    // ユーザーがスクロール中であることを記録
    isUserScrolling = true;
    
    // 既存のタイマーをクリア
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // 200ms後にスクロール終了とみなす
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 200);
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // 一番下近くにいる場合は自動スクロールを有効に
    shouldScrollToBottom = isNearBottom;
    
    if (shouldScrollToBottom) {
      logAutoScroll("ユーザーが最下部近くにスクロール");
    }
  };

  // DOM更新後にスクロール処理を実行（制限付き）
  let lastUpdateTime = 0;
  afterUpdate(() => {
    const now = Date.now();
    // 100ms以内の連続更新は無視（過度な自動スクロールを防ぐ）
    if (now - lastUpdateTime < 100) {
      return;
    }
    lastUpdateTime = now;
    
    if (messagesContainer && shouldScrollToBottom && !isUserScrolling) {
      logAutoScroll("DOM更新後");
      scrollToBottom();
    }
  });

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
    selectedImages = [];
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    imagePreviewUrls = [];
    replyId = null;
    parentEvent = null;
    replyToEvent = null;
    shouldScrollToBottom = true; // チャンネル変更時は一番下までスクロール
    previousEventCount = 0; // イベント数もリセット
    isInitialLoad = true; // 初回ロード状態をリセット
    knownEventIds.clear(); // 既知のイベントIDもクリア
    // チャンネル名の状態もリセット
    channelNameLoaded = false;
    channelName = "";
  };

  // ログイン状態をチェックする関数
  const checkLoginStatus = () => {
    const seckey = getSecKey();
    const useNip07 = getUseNip07();
    isLoggedIn = !!seckey || (useNip07 && $nip07Available);
  };

  // DOM監視を開始
  onMount(() => {
    messageCheckInterval = setInterval(checkMessageCountChange, 1000); // 1秒ごとにチェック
    
    return () => {
      if (messageCheckInterval) {
        clearInterval(messageCheckInterval);
      }
    };
  });

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

    // DOM監視を開始
    messageCheckInterval = setInterval(checkMessageCountChange, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleFocus);
      if (messageCheckInterval) {
        clearInterval(messageCheckInterval);
      }
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

  $: submitDisabled = !postContent.trim() || isUploading;

  // textareaの初期化
  $: if (textareaElement) {
    initializeTextarea(textareaElement);
  }

  // 画像選択処理
  const handleImageSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          selectedImages.push(file);
          imagePreviewUrls.push(URL.createObjectURL(file));
        }
      }
      selectedImages = selectedImages; // リアクティブ更新をトリガー
      imagePreviewUrls = imagePreviewUrls; // リアクティブ更新をトリガー
    }
    // inputをリセット
    input.value = '';
  };

  // 画像削除処理
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    selectedImages.splice(index, 1);
    imagePreviewUrls.splice(index, 1);
    selectedImages = selectedImages; // リアクティブ更新をトリガー
    imagePreviewUrls = imagePreviewUrls; // リアクティブ更新をトリガー
  };

  // 画像をBase64に変換
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // NIP-98認証ヘッダーを生成
  const createNip98AuthHeader = async (url: string, method: string, payload?: ArrayBuffer) => {
    const useNip07 = getUseNip07();
    const seckey = getSecKey();
    
    try {
      const authEvent = {
        kind: 27235, // NIP-98
        content: '',
        tags: [
          ['u', url],
          ['method', method]
        ],
        created_at: Math.floor(Date.now() / 1000)
      };
      
      // ペイロードのハッシュを追加（ある場合）
      if (payload) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', payload);
        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
        authEvent.tags.push(['payload', hashHex]);
      }
      
      let signedEvent;
             if (useNip07 && window.nostr) {
         signedEvent = await window.nostr.signEvent(authEvent);
       } else if (seckey) {
         signedEvent = finalizeEvent(authEvent, hexToBytes(seckey));
       } else {
         throw new Error('認証情報がありません');
       }
      
      return 'Nostr ' + btoa(JSON.stringify(signedEvent));
    } catch (error) {
      console.error('NIP-98認証ヘッダー生成エラー:', error);
      throw error;
    }
  };

  // 画像アップロード（nostr.buildのみ使用）
  const uploadImages = async (images: File[]): Promise<string[]> => {
    const uploadPromises = images.map(async (image) => {
      // より大きなサイズ（500KB以下）もBase64で処理を試行
      if (image.size <= 500 * 1024) {
        try {
          const base64 = await convertToBase64(image);
          console.log(`Image converted to Base64: ${image.name} (${image.size} bytes)`);
          return base64;
        } catch (error) {
          console.error('Base64 conversion failed:', error);
          // Base64変換に失敗した場合は外部アップロードにフォールバック
        }
      }
      
      // nostr.buildへのアップロード
      try {
        console.log(`Uploading to nostr.build: ${image.name} (${image.size} bytes)`);
        uploadProgress = `画像をアップロード中: ${image.name}`;
        
        const formData = new FormData();
        formData.append('file', image);
        
        // ファイルデータをUint8Arrayに変換してNIP-98認証用
        const arrayBuffer = await image.arrayBuffer();
        
        const authHeader = await createNip98AuthHeader('https://nostr.build/api/v2/upload/files', 'POST', arrayBuffer);
        
        const response = await fetch('https://nostr.build/api/v2/upload/files', {
          method: 'POST',
          headers: {
            'Authorization': authHeader
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`nostr.build upload error (${response.status}):`, errorText);
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('nostr.build upload result:', result);
        
        // nostr.buildのレスポンス形式に応じて調整
        if (result.status === 'success' && result.data && result.data.length > 0) {
          const imageUrl = result.data[0].url;
          if (imageUrl && imageUrl.startsWith('http')) {
            console.log(`Successfully uploaded to nostr.build: ${imageUrl}`);
            return imageUrl;
          }
        }
        
        throw new Error('nostr.buildから有効なURLが返されませんでした');
      } catch (error) {
        console.error('nostr.build upload failed:', error);
        
        // nostr.buildが失敗した場合、Base64にフォールバック（サイズに関係なく）
        console.warn('nostr.build failed, falling back to Base64 encoding...');
        try {
          const base64 = await convertToBase64(image);
          console.log(`Fallback Base64 conversion successful: ${image.name} (${image.size} bytes)`);
          return base64;
        } catch (base64Error) {
          console.error('Fallback Base64 conversion also failed:', base64Error);
          throw new Error(`画像の処理に失敗しました: ${image.name}`);
        }
      }
      
    });
    
    return Promise.all(uploadPromises);
  };

  const submit = async () => {
    // 空白や空文字の投稿を阻止
    if (!postContent.trim()) {
      return;
    }
    
    const useNip07 = getUseNip07();
    const seckey = getSecKey();
    
    // NIP-07を使用する場合とnsec1を使用する場合の分岐
    if (useNip07) {
      if (!$nip07Available) {
        alert("ブラウザ拡張機能が利用できません。設定でnsec1方式に切り替えるか、拡張機能をインストールしてください。");
        return;
      }
    } else {
      if (!seckey) {
        alert("投稿するには鍵の生成または登録が必要です");
        return;
      }
    }
    
    try {
      // リレー接続状況をチェック
      const relayStatus = await checkRelayConnections();
      const connectedRelays = Object.entries(relayStatus).filter(([_, connected]) => connected);
      
      if (connectedRelays.length === 0) {
        alert("現在利用可能なリレーがありません。しばらく待ってから再試行してください。");
        return;
      }
      
      // 画像がある場合はアップロード
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        isUploading = true;
        uploadProgress = "画像をアップロード中...";
        try {
          imageUrls = await uploadImages(selectedImages);
        } catch (error) {
          isUploading = false;
          uploadProgress = "";
          alert(`画像のアップロードに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
      }
      
      uploadProgress = "投稿中...";
      let result: boolean;
      if (useNip07) {
        result = await postWithNip07(postContent, channel_id, replyId, imageUrls);
      } else {
        result = await post(postContent, channel_id, seckey!, replyId, imageUrls);
      }
      
      if (result) {
        // 投稿内容、画像、リプライ状態をクリア
        postContent = "";
        selectedImages = [];
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        imagePreviewUrls = [];
        replyId = null;
        replyToEvent = null;
        isUploading = false;
        uploadProgress = "";
        
        // 投稿後は一番下までスクロール（強制実行）
        shouldScrollToBottom = true;
        isUserScrolling = false; // 投稿後は強制的にリセット
        logAutoScroll("投稿完了後");
        setTimeout(() => {
          scrollToBottom();
        }, 150); // 少し長めの遅延
        
        // textareaの高さをリセット
        if (textareaElement) {
          textareaElement.style.height = 'auto';
          textareaElement.style.height = Math.max(textareaElement.scrollHeight, 44) + 'px';
        }
      }
    } catch (error) {
      isUploading = false;
      uploadProgress = "";
      alert(`投稿に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const submitKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "Enter") {
      // 空白や空文字の投稿を阻止
      if (!postContent.trim()) {
        return;
      }
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
      
      // 適切な高さを計算（最小44px、最大160px）
      const newHeight = Math.min(Math.max(scrollHeight, 44), 160);
      
      // 高さを設定
      textarea.style.height = newHeight + 'px';
    }
  };

  // textareaの初期化
  const initializeTextarea = (textarea: HTMLTextAreaElement) => {
    if (textarea && !textarea.style.height) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.max(scrollHeight, 44) + 'px';
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

  // eventsの長さを監視するための変数
  let eventsLength = 0;
  $: if (eventsLength > 0) {
    // 新規投稿が追加された場合（初回ロード時は除く）
    if (previousEventCount > 0 && eventsLength > previousEventCount) {
      console.log(`新規投稿を検出: ${eventsLength - previousEventCount}件`);
      
      // ユーザーが最下部近くにいて、かつスクロール中でない場合のみ自動スクロール
      if (shouldScrollToBottom && messagesContainer && !isUserScrolling) {
        logAutoScroll("新規投稿検出");
        setTimeout(() => {
          if (!isUserScrolling) { // 再度チェック
            scrollToBottom();
          }
        }, 100);
      }
    }
    
    // 初回ロード時は新規投稿とみなさない
    if (isInitialLoad) {
      isInitialLoad = false;
    }
    
    previousEventCount = eventsLength;
  };

  // nosvelteに適した新規投稿検出
  let knownEventIds = new Set<string>();
  let lastEventCheckTime = 0;
  
  const checkForNewEvents = (events: Nostr.Event[]) => {
    const now = Date.now();
    // 500ms以内の連続チェックを防ぐ
    if (now - lastEventCheckTime < 500) {
      return;
    }
    lastEventCheckTime = now;
    
    if (!events || events.length === 0) {
      return;
    }
    
    // 新しいイベントIDを検出
    const newEvents = events.filter(event => !knownEventIds.has(event.id));
    
    if (newEvents.length > 0 && knownEventIds.size > 0) { // 初回ロード時は除外
      console.log(`新規イベント検出: ${newEvents.length}件`);
      
      // ユーザーが最下部近くにいて、かつスクロール中でない場合のみ自動スクロール
      if (shouldScrollToBottom && messagesContainer && !isUserScrolling) {
        logAutoScroll(`新規イベント: ${newEvents.length}件`);
        setTimeout(() => {
          if (!isUserScrolling && shouldScrollToBottom) {
            scrollToBottom();
          }
        }, 200); // 少し長めの遅延でDOM更新を確実に待つ
      }
    }
    
    // 既知のイベントIDセットを更新
    events.forEach(event => knownEventIds.add(event.id));
  };

  // 新規投稿検出のデバッグ用ログ
  let lastScrollTime = 0;
  const logAutoScroll = (reason: string) => {
    const now = Date.now();
    if (now - lastScrollTime > 1000) { // 1秒以内の重複ログを防ぐ
      console.log(`自動スクロール実行: ${reason}`);
      lastScrollTime = now;
    }
  };

  // eventsを監視するためのreactive statement（nosvelteに適応）
  let currentEvents: Nostr.Event[] = [];
  $: if (currentEvents) {
    checkForNewEvents(currentEvents);
  };

  // DOMベースの新規投稿検出（nosvelteのフォールバック）
  let lastMessageCount = 0;
  let messageCheckInterval: number;

  const checkMessageCountChange = () => {
    if (!messagesContainer) return;
    
    const messageElements = messagesContainer.querySelectorAll('.message-wrapper');
    const currentMessageCount = messageElements.length;
    
    if (lastMessageCount > 0 && currentMessageCount > lastMessageCount) {
      console.log(`DOM監視: 新規メッセージ検出 ${currentMessageCount - lastMessageCount}件`);
      
      // ユーザーが最下部近くにいて、かつスクロール中でない場合のみ自動スクロール
      if (shouldScrollToBottom && !isUserScrolling) {
        logAutoScroll(`DOM監視: +${currentMessageCount - lastMessageCount}件`);
        setTimeout(() => {
          if (!isUserScrolling && shouldScrollToBottom) {
            scrollToBottom();
          }
        }, 300);
      }
    }
    
    lastMessageCount = currentMessageCount;
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
        <!-- eventsの長さを監視 -->
        <span class="hidden-debug">{eventsLength = events.length}</span>

      <div slot="loading" class="loading-container flex flex-col items-center justify-center py-[60px] px-5 text-center text-foreground-secondary">
        <div class="loading-spinner"></div>
        <p>メッセージを読み込み中...</p>
      </div>
      <div slot="error" let:error class="error-container py-10 px-5 text-center text-error">
        <p class="text-error font-medium">エラー: {error}</p>
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
        <div 
          class="messages-list"
          bind:this={messagesContainer}
          on:scroll={handleScroll}
        >
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
              <!-- 画像プレビューエリア -->
              <div class="image-preview-container">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  on:change={handleImageSelect}
                  class="image-input"
                  id="image-input"
                />
                <label for="image-input" class="image-add-button">
                  <Icon name="image" size={18} />
                </label>
                {#if imagePreviewUrls.length > 0}
                  {#each imagePreviewUrls as imageUrl, index}
                    <div class="image-preview-item">
                      <img src={imageUrl} alt="プレビュー" class="image-preview" />
                      <button 
                        class="image-remove-button" 
                        on:click={() => removeImage(index)}
                        type="button"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>
              
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
                <div class="button-group">
                  <button 
                    class="send-button" 
                    on:click={submit} 
                    type="button" 
                    disabled={submitDisabled}
                  >
                    {#if isUploading}
                      <Icon name="loader" size={16} />
                    {:else}
                      <Icon name="send" size={16} />
                    {/if}
                  </button>
                </div>
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

<!-- アップロード中のローディングオーバーレイ -->
{#if isUploading}
  <div class="upload-overlay">
    <div class="upload-modal">
      <div class="upload-spinner"></div>
      <p class="upload-text">{uploadProgress}</p>
      <p class="upload-subtext">しばらくお待ちください...</p>
    </div>
  </div>
{/if}

<style>
  .chat-channel {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
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

  /* error-container と error-message は Tailwind に移行済み */

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

  .button-group {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .image-input {
    display: none;
  }

  .image-add-button {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    color: var(--secondary-text);
    flex-shrink: 0;
  }

  .image-add-button:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .image-preview-container {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    align-items: flex-start;
    width: 100%;
    max-height: 140px;
    overflow-x: auto;
    overflow-y: hidden;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .image-preview-item {
    position: relative;
    width: 100px;
    height: 100px;
    min-width: 100px;
    flex-shrink: 0;
    border-radius: 12px;
    overflow: visible;
    border: 2px solid var(--border-color);
  }

  .image-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }

  .image-remove-button {
    position: absolute;
    top: -8px;
    right: -8px;
    background: rgba(107, 114, 128, 0.9);
    color: white;
    border: 1px solid white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 2;
    padding: 0;
    box-sizing: border-box;
  }

  .image-remove-button:hover {
    background: rgba(75, 85, 99, 0.95);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .image-remove-button :global(svg) {
    width: 12px !important;
    height: 12px !important;
    flex-shrink: 0;
  }

  /* モバイル向けの画像プレビュー調整 */
  @media (max-width: 768px) {
    .image-preview-container {
      gap: 8px;
      margin-bottom: 12px;
    }

    .image-add-button {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
    }

    .image-add-button :global(svg) {
      width: 16px;
      height: 16px;
    }

    .image-preview-item {
      width: 80px;
      height: 80px;
      border-radius: 8px;
    }

    .image-preview {
      border-radius: 6px;
    }

    .image-remove-button {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      top: -6px;
      right: -6px;
    }

    .image-remove-button :global(svg) {
      width: 10px !important;
      height: 10px !important;
    }
  }

  /* 小さな画面では画像を小さく */
  @media (max-width: 480px) {
    .image-preview-container {
      gap: 6px;
    }

    .image-add-button {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
    }

    .image-add-button :global(svg) {
      width: 14px;
      height: 14px;
    }

    .image-preview-item {
      width: 60px;
      height: 60px;
      border-radius: 6px;
    }

    .image-preview {
      border-radius: 4px;
    }

    .image-remove-button {
      width: 18px;
      height: 18px;
      min-width: 18px;
      min-height: 18px;
      top: -5px;
      right: -5px;
    }

    .image-remove-button :global(svg) {
      width: 8px !important;
      height: 8px !important;
    }
  }

  .message-input {
    flex: 1;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--input-bg);
    padding: 10px 12px;
    font-size: 1rem;
    line-height: 1.5;
    resize: none;
    min-height: 44px;
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
    padding: 10px 18px;
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

    .button-group {
      width: 100%;
      justify-content: space-between;
    }

    .send-button {
      flex: 1;
      height: 48px;
      padding: 12px 16px;
      justify-content: center;
      font-size: 1rem;
    }

    .image-preview-container {
      margin: 0 0 12px 0;
      max-width: none;
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

  /* デバッグ用要素を非表示 */
  .hidden-debug {
    display: none;
  }

  /* アップロード中のローディングオーバーレイ */
  .upload-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: var(--z-upload-overlay);
    backdrop-filter: blur(4px);
  }

  .upload-modal {
    background: var(--bg-primary);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
    max-width: 400px;
    width: 90%;
  }

  .upload-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .upload-text {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 8px 0;
  }

  .upload-subtext {
    font-size: 0.9rem;
    color: var(--secondary-text);
    margin: 0;
  }
</style>
