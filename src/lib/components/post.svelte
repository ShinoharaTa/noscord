<script lang="ts">
  import { parseContent, parseCreated, parseTimeOnly, processCustomEmojis } from "$lib/app";
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
  
  // 画像ビューアーの状態管理
  let isImageModalOpen = false;
  let currentImageIndex = 0;
  let currentImageUrl = "";
  
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

<article class="post">
  <div class="post-header">
    <h3
      class="post-author"
      style="border-left: 4px solid #{event.pubkey.slice(0, 6)};"
      title="{getDisplayName()} (ID: {event.pubkey.slice(0, 10)})"
    >
      {getDisplayName()}
    </h3>
    <div class="post-meta">
      <aside class="post-id" title="投稿ID: {event.id}">
        ID: {event.id.slice(0, 10)}
      </aside>
      <time 
        class="post-time" 
        data-time={parseTimeOnly(event.created_at)}
        title={parseCreated(event.created_at)}
      >
        {parseTimeOnly(event.created_at)}
      </time>
    </div>
  </div>
  
  {#if reply && action}
    <a href="javascript: void(0);" class="reply-link" on:click={onClickParentId}>
      {`>>${reply.slice(0, 10)}`}
    </a>
  {/if}
  {#if reply && !action}
    <span class="reply-text">{`>>${reply.slice(0, 10)}`}</span>
  {/if}
  
  <div class="post-content">
    <p>{@html processedText}</p>
    {#each parsed.other_urls as url}
      <p>
        <a href={url} target="_blank" class="url-link">
          {url}
        </a>
      </p>
    {/each}
    {#if parsed.image_urls.length > 0}
      <div class="image-gallery">
        {#each parsed.image_urls as image, index}
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
    <div class="post-actions">
      <button class="reply-btn small" on:click={onClickReply(event.id)}>
        <Icon name="reply" size={16} />
        リプライ
      </button>
    </div>
  {/if}
</article>

<!-- 画像モーダル -->
{#if isImageModalOpen}
  <div class="image-modal-overlay" on:click={closeImageModal}>
    <div class="image-modal" on:click|stopPropagation>
      <button class="image-modal-close" on:click={closeImageModal}>
        <Icon name="x" size={24} />
      </button>
      
      <div class="image-modal-content">
        <img src={currentImageUrl} alt="" class="modal-image" />
        
        {#if parsed.image_urls.length > 1}
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
              disabled={currentImageIndex === parsed.image_urls.length - 1}
            >
              <Icon name="right" size={24} />
            </button>
            
            <div class="image-counter">
              {currentImageIndex + 1} / {parsed.image_urls.length}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* 投稿コンテナ：レスポンシブ対応 */
  .post {
    padding: 16px 0;
    border-bottom: 1px solid var(--border-color);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .post:last-child {
    border-bottom: none;
  }

  /* ヘッダー：レスポンシブ対応 */
  .post-header {
    margin-bottom: 8px;
  }

  /* デスクトップ表示：横並び */
  @media (min-width: 768px) {
    .post-header {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .post-author {
      flex: 1;
      min-width: 0;
    }

    .post-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
  }

  /* モバイル表示：縦並び */
  @media (max-width: 767px) {
    .post-header {
      display: block;
    }

    .post-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      padding-left: 8px;
    }
  }

  .post-author {
    color: var(--primary-color);
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    padding-left: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .post-time {
    font-size: 0.85rem;
    color: var(--muted-text);
    white-space: nowrap;
  }

  .post-id {
    font-size: 0.8rem;
    color: var(--muted-text);
    white-space: nowrap;
  }

  /* コンテンツエリア */
  .post-content {
    margin: 8px 0;
  }

  .post-content p {
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    line-height: 1.5;
    margin: 8px 0;
  }

  /* カスタム絵文字スタイル */
  article img.custom-emoji,
  .post-content .custom-emoji {
    display: inline-block !important;
    vertical-align: middle !important;
    width: 1em !important;
    height: 1em !important;
    max-width: 1em !important;
    max-height: 1em !important;
    aspect-ratio: 1 / 1 !important;
    margin: 0 0.1em !important;
    border-radius: 2px !important;
    object-fit: contain !important;
  }

  /* リプライリンク */
  .reply-link, .reply-text {
    font-size: 0.9rem;
    color: var(--primary-color);
    text-decoration: none;
    margin-bottom: 8px;
    display: block;
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
    }
  }

  /* スマートフォンでの画像アイテム */
  @media (max-width: 767px) {
    .image-item {
      flex: 0 0 36vw;
      width: 36vw;
      height: 36vw;
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

  /* アクション */
  .post-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }

  .reply-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    background: none;
    color: var(--text-color);
    font-size: 0.85rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: var(--font-weight-medium);
  }

  .reply-btn:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  /* 画像モーダル */
  .image-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
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
</style>
