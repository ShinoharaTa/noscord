<script lang="ts">
  import { parseContent, parseCreated, parseTimeOnly } from "$lib/app";
  import type { Nostr } from "nosvelte";
  import { createEventDispatcher } from "svelte";
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
    <p>{parsed.text_without_urls}</p>
    {#each parsed.other_urls as url}
      <p>
        <a href={url} target="_blank" class="url-link">
          {url}
        </a>
      </p>
    {/each}
    {#each parsed.image_urls as image}
      <a href={image} target="_blank" class="image-link">
        <img src={image} alt="" />
      </a>
    {/each}
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

  /* 画像 */
  .image-link {
    display: block;
    margin: 12px 0;
    text-align: center;
  }

  .image-link img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
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
</style>
