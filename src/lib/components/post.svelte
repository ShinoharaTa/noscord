<script lang="ts">
  import { parseContent, parseCreated, parseTimeOnly, processCustomEmojis, aggregateReactions, sanitizeReactionContent, processReactionEmoji, type ReactionSummary } from "$lib/app";
  import { getReactions, react, reactWithNip07, deleteReaction, deleteReactionWithNip07 } from "$lib/nostr";
  import { getSecKey, getUseNip07, nip07Available } from "$lib/store";
  import type { Nostr } from "nosvelte";
  import { createEventDispatcher, onMount } from "svelte";
  import Icon from "./icons.svelte";
  const dispatch = createEventDispatcher();

  export let event: Nostr.Event<Nostr.Kind.Text>;
  export let metadata: Nostr.Event<Nostr.Kind.Metadata> | undefined = undefined;
  export let action = true;
  const parsed = parseContent(event.content);
  const reply_tag = event.tags.find(
    (tag) => tag.includes("e") && tag.includes("reply"),
  );
  const reply = reply_tag ? reply_tag[1] : null;
  
  // カスタム絵文字で処理されたテキスト
  const processedText = processCustomEmojis(parsed.text_without_urls, event);
  
  // 画像URL抽出（NIP-92対応）
  const extractImages = (event: Nostr.Event) => {
    const images: string[] = [];
    
    // imetaタグから画像URLを取得（NIP-92）
    const imetaTags = event.tags.filter(tag => tag[0] === 'imeta');
    imetaTags.forEach(tag => {
      // imetaタグの形式: ["imeta", "url <url>", "m <mime-type>", ...]
      for (let i = 1; i < tag.length; i++) {
        if (tag[i].startsWith('url ')) {
          const url = tag[i].substring(4); // "url "を除去
          images.push(url);
        }
      }
    });
    
    // contentから画像URLを抽出（改行区切り）
    const lines = event.content.split('\n');
    lines.forEach(line => {
      const trimmedLine = line.trim();
      // HTTP/HTTPSで始まる画像URL
      if (/^https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp)(?:\?[^\s]*)?$/i.test(trimmedLine)) {
        images.push(trimmedLine);
      }
      // Base64画像データ
      if (trimmedLine.startsWith('data:image/')) {
        images.push(trimmedLine);
      }
    });
    
    return [...new Set(images)]; // 重複を除去
  };
  
  const eventImages = extractImages(event);
  
  // 画像ビューアーの状態管理
  let isImageModalOpen = false;
  let currentImageIndex = 0;
  let currentImageUrl = "";
  
  // リアクション管理
  let reactions: ReactionSummary[] = [];
  let loadingReactions = false;
  let addingReaction = false;
  let pendingReactions = new Set<string>(); // 処理中のリアクションを追跡
  
  // 現在のユーザーの公開鍵を取得
  let currentUserPubkey = '';
  const updateCurrentUserPubkey = async () => {
    const useNip07 = getUseNip07();
    if (useNip07 && $nip07Available && window.nostr) {
      try {
        currentUserPubkey = await window.nostr.getPublicKey();
      } catch (e) {
        console.warn('NIP-07で公開鍵を取得できませんでした:', e);
      }
    } else {
      const seckey = getSecKey();
      if (seckey) {
        // 秘密鍵から公開鍵を生成
        const { getPublicKey } = await import('nostr-tools');
        const { hexToBytes } = await import('@noble/hashes/utils.js');
        currentUserPubkey = getPublicKey(hexToBytes(seckey));
      }
    }
  };
  
  // metadataから表示名を取得、失敗した場合はpubkeyを使用
  const getDisplayName = () => {
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
  
  function onClickReply(id: string) {
    dispatch("reply", { id });
    return null;
  }
  function onClickParentId() {
    dispatch("openReply", { id: reply });
  }
  
  // 画像クリック時の処理
  function openImageModal(imageUrl: string, index: number) {
    currentImageUrl = imageUrl;
    currentImageIndex = index;
    isImageModalOpen = true;
    document.body.style.overflow = "hidden";
  }
  
  // モーダルを閉じる
  function closeImageModal() {
    isImageModalOpen = false;
    document.body.style.overflow = "";
  }

  function handleImageOverlayKeydown(event: KeyboardEvent) {
    // Enter / Space で閉じる（A11y）
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeImageModal();
    }
  }
  
  // リアクションを読み込む
  const loadReactions = async () => {
    loadingReactions = true;
    try {
      const reactionEvents = await getReactions(event.id);
      reactions = aggregateReactions(reactionEvents, currentUserPubkey);
    } catch (error) {
      console.error('リアクション読み込みエラー:', error);
    } finally {
      loadingReactions = false;
    }
  };
  
  // リアクションを送信または削除
  const sendReaction = async (reactionContent: string) => {
    if (addingReaction || pendingReactions.has(reactionContent)) return;
    
    const sanitized = sanitizeReactionContent(reactionContent);
    if (!sanitized) return;
    
    pendingReactions.add(reactionContent);
    
    // 既に自分がそのリアクションをしているかチェック
    const existingReaction = reactions.find(r => r.content === sanitized && r.hasCurrentUser);
    
    console.log('リアクション処理デバッグ:', {
      originalContent: reactionContent,
      sanitized: sanitized,
      existingReaction: existingReaction,
      hasCurrentUser: existingReaction?.hasCurrentUser,
      currentUserReactionId: existingReaction?.currentUserReactionId,
      allReactions: reactions.map(r => ({
        content: r.content,
        hasCurrentUser: r.hasCurrentUser,
        currentUserReactionId: r.currentUserReactionId
      }))
    });
    
    addingReaction = true;
    try {
      const useNip07 = getUseNip07();
      let success = false;
      
      // サーバーから最新のリアクション状態を確認
      const latestReactions = await getReactions(event.id);
      const latestAggregated = aggregateReactions(latestReactions, currentUserPubkey);
      const latestExistingReaction = latestAggregated.find(r => r.content === sanitized && r.hasCurrentUser);
      
      console.log('最新リアクション状態確認:', {
        localExisting: existingReaction,
        latestExisting: latestExistingReaction,
        shouldDelete: !!latestExistingReaction?.currentUserReactionId
      });
      
      if (latestExistingReaction && latestExistingReaction.currentUserReactionId) {
        // 既存のリアクションを削除
        if (useNip07 && $nip07Available) {
          success = await deleteReactionWithNip07(latestExistingReaction.currentUserReactionId!);
        } else {
          const seckey = getSecKey();
          if (seckey) {
            success = await deleteReaction(latestExistingReaction.currentUserReactionId!, seckey);
          } else {
            alert('リアクション削除にはログインが必要です');
            return;
          }
        }
      } else {
        // 新しいリアクションを送信
        if (useNip07 && $nip07Available) {
          success = await reactWithNip07(sanitized, event.id, event.pubkey);
        } else {
          const seckey = getSecKey();
          if (seckey) {
            success = await react(sanitized, event.id, event.pubkey, seckey);
          } else {
            alert('リアクションするにはログインが必要です');
            return;
          }
        }
      }
      
                    if (success) {
        // 即座にローカル状態を更新（UX改善）
        if (latestExistingReaction && latestExistingReaction.currentUserReactionId) {
          // 削除の場合：該当リアクションを更新
          const reactionIndex = reactions.findIndex(r => r.content === sanitized);
          if (reactionIndex !== -1) {
            if (reactions[reactionIndex].count > 1) {
              reactions[reactionIndex].count--;
              reactions[reactionIndex].hasCurrentUser = false;
              reactions[reactionIndex].currentUserReactionId = undefined;
              // ユーザーリストからも削除
              reactions[reactionIndex].users = reactions[reactionIndex].users.filter(u => u !== currentUserPubkey);
            } else {
              reactions.splice(reactionIndex, 1);
            }
            reactions = [...reactions]; // リアクティブ更新をトリガー
          }
        } else {
          // 追加の場合：即座に表示
          const existingIndex = reactions.findIndex(r => r.content === sanitized);
          if (existingIndex !== -1) {
            reactions[existingIndex].count++;
            reactions[existingIndex].hasCurrentUser = true;
            reactions[existingIndex].currentUserReactionId = 'pending'; // 一時的なID
            // ユーザーリストに追加
            if (!reactions[existingIndex].users.includes(currentUserPubkey)) {
              reactions[existingIndex].users.push(currentUserPubkey);
            }
          } else {
            reactions.push({
              content: sanitized,
              count: 1,
              users: [currentUserPubkey],
              hasCurrentUser: true,
              currentUserReactionId: 'pending' // 一時的なID
            });
          }
          reactions = [...reactions];
        }
        
        // 少し遅延してからバックグラウンドでリアクションを再読み込み（正確な状態同期）
        setTimeout(() => {
          loadReactions();
        }, 500);
      }
    } catch (error) {
      console.error('リアクション処理エラー:', error);
      alert('リアクションの処理に失敗しました');
    } finally {
      addingReaction = false;
      pendingReactions.delete(reactionContent);
    }
  };
  

  
    // 前の画像
  function previousImage() {
    if (currentImageIndex > 0) {
      currentImageIndex--;
      currentImageUrl = parsed.image_urls[currentImageIndex];
    }
  }

  // 次の画像
  function nextImage() {
    if (currentImageIndex < parsed.image_urls.length - 1) {
      currentImageIndex++;
      currentImageUrl = parsed.image_urls[currentImageIndex];
    }
  }
  
  // コンポーネント初期化時の処理
  onMount(() => {
    const initialize = async () => {
      await updateCurrentUserPubkey();
      await loadReactions();
    };
    void initialize();
    
    // ページがフォーカスを取り戻した時にリアクションを再読み込み
    const handleFocus = () => {
      loadReactions();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  });
  

  
  // キーボードイベント
  function handleKeydown(event: KeyboardEvent) {
    if (!isImageModalOpen) return;
    
    if (event.key === "Escape") {
      closeImageModal();
    } else if (event.key === "ArrowLeft") {
      previousImage();
    } else if (event.key === "ArrowRight") {
      nextImage();
    }
  }
  
  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
    };
  });
</script>

<article class="post py-4 border-b border-border break-words last:border-b-0">
  <div class="post-header mb-2 md:flex md:items-center md:gap-3 md:min-w-0">
    <h3
      class="post-author text-accent text-base font-semibold m-0 pl-2 whitespace-nowrap overflow-hidden text-ellipsis md:flex-1 md:min-w-0"
      style="border-left: 4px solid #{event.pubkey.slice(0, 6)};"
      title="{getDisplayName()} (ID: {event.pubkey.slice(0, 10)})"
    >
      {getDisplayName()}
    </h3>
    <div class="post-meta flex items-center gap-2 max-md:mt-1 max-md:pl-2 md:gap-3 md:shrink-0">
      <aside class="text-xs text-foreground-muted whitespace-nowrap" title="投稿ID: {event.id}">
        ID: {event.id.slice(0, 10)}
      </aside>
      <time 
        class="text-sm text-foreground-muted whitespace-nowrap" 
        data-time={parseTimeOnly(event.created_at)}
        title={parseCreated(event.created_at)}
      >
        {parseTimeOnly(event.created_at)}
      </time>
    </div>
  </div>
  
  {#if reply && action}
    <button type="button" class="reply-link" on:click={onClickParentId}>
      {`>>${reply.slice(0, 10)}`}
    </button>
  {/if}
  {#if reply && !action}
    <span class="reply-text">{`>>${reply.slice(0, 10)}`}</span>
  {/if}
  
  <div class="post-content my-2 [overflow-wrap:anywhere] break-words">
    <p>{@html processedText}</p>
    {#each parsed.other_urls as url}
      <p>
        <a href={url} target="_blank" class="url-link">
          {url}
        </a>
      </p>
    {/each}
    {#if eventImages.length > 0}
      <div class="image-gallery">
        {#each eventImages as image, index}
          <button class="image-item" on:click={() => openImageModal(image, index)}>
            <img src={image} alt="" />
          </button>
        {/each}
      </div>
    {/if}
    {#each parsed.twitter_urls as url}
      <p>
        <a href={url} target="_blank" class="url-link">{url}</a>
      </p>
    {/each}
  </div>
  
  {#if action}
    <div class="post-actions mt-3 flex gap-2">
      <button class="reply-btn small" on:click={onClickReply(event.id)}>
        <Icon name="reply" size={16} />
      </button>
      
      <!-- ⭐リアクションボタン -->
      {#if reactions.find(r => r.content === '⭐️')}
        {@const starReaction = reactions.find(r => r.content === '⭐️')}
        <button 
          class="reaction-btn small {starReaction?.hasCurrentUser ? 'user-reacted' : ''}"
          on:click={() => sendReaction('⭐️')}
          disabled={addingReaction || pendingReactions.has('⭐️')}
          title="リアクション済み: {starReaction?.hasCurrentUser}, ユーザー: {currentUserPubkey?.slice(0,8)}"
        >
          {#if addingReaction}
            <Icon name="loader" size={16} />
          {:else}
            <span class="reaction-emoji">⭐️</span>
          {/if}
          {#if starReaction && starReaction.count > 1}
            {starReaction.count}
          {/if}
        </button>
      {:else}
        <button 
          class="reaction-btn small"
          on:click={() => sendReaction('⭐️')}
          disabled={addingReaction}
        >
          {#if addingReaction}
            <Icon name="loader" size={16} />
          {:else}
            <span class="reaction-emoji">⭐️</span>
          {/if}
        </button>
      {/if}
      
      <!-- その他のリアクションボタン -->
      {#each reactions.filter(r => r.content !== '⭐️') as reaction (reaction.content)}
        <button 
          class="reaction-btn small {reaction.hasCurrentUser ? 'user-reacted' : ''}"
          on:click={() => sendReaction(reaction.content)}
          disabled={addingReaction || pendingReactions.has(reaction.content)}
          title="リアクション済み: {reaction.hasCurrentUser}, ID: {reaction.currentUserReactionId?.slice(0,8)}"
        >
          <span class="reaction-emoji">{@html processReactionEmoji(reaction.content, reaction.sampleEvent)}</span>
          {#if reaction.count > 1}
            {reaction.count}
          {/if}
        </button>
      {/each}
      

    </div>
  {/if}


</article>

<!-- 画像モーダル -->
{#if isImageModalOpen}
  <div
    class="image-modal-overlay"
    role="button"
    aria-label="画像モーダルを閉じる"
    tabindex="0"
    on:click|self={closeImageModal}
    on:keydown={handleImageOverlayKeydown}
  >
    <div class="image-modal">
      <button class="image-modal-close" on:click={closeImageModal}>
        <Icon name="x" size={24} />
      </button>
      
      <div class="image-modal-content">
        <img src={currentImageUrl} alt="" class="modal-image" />
        
        {#if eventImages.length > 1}
          <div class="image-navigation">
            <button 
              class="nav-button nav-prev" 
              on:click={previousImage}
              disabled={currentImageIndex === 0}
            >
              <Icon name="left" size={24} />
            </button>
            <button 
              class="nav-button nav-next" 
              on:click={nextImage}
              disabled={currentImageIndex === eventImages.length - 1}
            >
              <Icon name="right" size={24} />
            </button>
            
            <div class="image-counter">
              {currentImageIndex + 1} / {eventImages.length}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* コンテンツ内の段落 */
  .post-content p {
    word-wrap: break-word;
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
    line-height: 1.5;
    margin: 8px 0;
  }

  /* カスタム絵文字スタイル（詳細度で制御、!important 不使用） */
  :global(article.post img.custom-emoji),
  :global(.post-content img.custom-emoji) {
    display: inline-block;
    vertical-align: middle;
    width: 1.3em;
    height: 1.3em;
    max-width: 1.3em;
    max-height: 1.3em;
    aspect-ratio: 1 / 1;
    margin: 0 0.1em;
    border-radius: 2px;
    object-fit: contain;
  }

  /* リプライリンク */
  .reply-link, .reply-text {
    font-size: 0.9rem;
    color: var(--primary-color);
    text-decoration: none;
    margin-bottom: 8px;
    display: block;
  }

  .reply-link {
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }

  .reply-link:hover {
    text-decoration: underline;
  }

  .reply-text {
    color: var(--muted-text);
  }

  /* URL リンク */
  .url-link {
    color: var(--primary-color);
    text-decoration: none;
    word-break: break-all;
    overflow-wrap: break-word;
    hyphens: none;
    line-height: 1.4;
  }

  .url-link:hover {
    text-decoration: underline;
    color: var(--primary-color-hover);
  }

  /* 画像ギャラリー：全デバイスで横スクロール */
  .image-gallery {
    margin: 12px 0;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    scroll-snap-type: x mandatory;
    max-height: 280px;
  }

  /* スクロールバーのスタイル（WebKit系ブラウザ） */
  .image-gallery::-webkit-scrollbar {
    height: 4px;
  }

  .image-gallery::-webkit-scrollbar-track {
    background: transparent;
  }

  .image-gallery::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }

  .image-gallery::-webkit-scrollbar-thumb:hover {
    background: var(--muted-text);
  }

  .image-item {
    display: block;
    scroll-snap-align: start;
    transition: all 0.2s ease;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
  }

  /* デスクトップでの画像アイテム：少し大きめのサムネイル */
  @media (min-width: 768px) {
    .image-item {
      flex: 0 0 150px;
      width: 150px;
      height: 150px;
      min-height: 0;
      aspect-ratio: 1 / 1;
    }
  }

  /* スマートフォンでの画像アイテム */
  @media (max-width: 767px) {
    .image-item {
      flex: 0 0 36vw;
      width: 36vw;
      height: 36vw;
      min-height: 0;
      aspect-ratio: 1 / 1;
    }
  }

  .image-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .image-item:hover img {
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .reply-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    background: #4a5568;
    color: white;
    font-size: 0.875rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: var(--font-weight-medium);
    line-height: 1.5;
    min-height: 2.25em;
  }

  .reply-btn:hover {
    background: #2d3748;
  }

  /* 画像モーダル */
  .image-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: var(--z-modal-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  }

  .image-modal {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background: var(--bg-primary);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .image-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.7);
    border: none;
    color: white;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .image-modal-close:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  .image-modal-content {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .modal-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .image-navigation {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(0, 0, 0, 0.7);
    padding: 12px 20px;
    border-radius: 25px;
    color: white;
  }

  .nav-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }

  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .image-counter {
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 60px;
    text-align: center;
  }

  /* レスポンシブ対応 */
  @media (max-width: 767px) {
    .image-modal-overlay {
      padding: 10px;
    }

    .image-modal {
      max-width: 95vw;
      max-height: 95vh;
    }

    .image-navigation {
      bottom: 10px;
      padding: 8px 16px;
      gap: 12px;
    }

    .nav-button {
      padding: 6px;
    }

    .image-counter {
      font-size: 0.8rem;
      min-width: 50px;
    }
  }



  /* リアクションボタンとピッカー */

  .reaction-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    background: #4a5568;
    color: white;
    font-size: 0.875rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: var(--font-weight-medium);
    line-height: 1.5;
    min-height: 2.25em; /* line-height 1.5 * 1.5em = 投稿テキストに合わせる */
  }

  .reaction-btn:hover {
    background: #2d3748;
  }

  .reaction-btn.user-reacted {
    background: var(--primary-color);
    color: white;
  }

  .reaction-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .reaction-emoji {
    font-size: 1.1em;
    line-height: 1;
  }

  /* リアクションボタン内の絵文字はマージンを除去 */
  .post-actions .reaction-btn .reaction-emoji,
  .post-actions .reaction-btn :global(.custom-emoji) {
    margin: 0;
  }

  /* リアクション絵文字画像用のスタイル */
  .post-actions .reaction-btn :global(.reaction-emoji-img) {
    width: 1.2em;
    height: 1.2em;
    vertical-align: middle;
    display: inline-block;
    object-fit: contain;
    max-width: 1.2em;
    max-height: 1.2em;
    margin: 0;
  }


</style>
