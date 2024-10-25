<script lang="ts">
  import { page } from "$app/stores";
  import Modal from "$lib/components/modal.svelte";
  import NavigationBar from "$lib/components/navbar.svelte";
  import Post from "$lib/components/post.svelte";
  import {
    getChannelMeta,
    getSingleEvent,
    post,
    relays,
    req,
  } from "$lib/nostr";
  import {
    getSecKey,
    modal,
  } from "$lib/store";
  import type { Event, Kind } from "nostr-tools";
  import type { Nostr } from "nosvelte";
  import { Metadata, NostrApp, UniqueEventList } from "nosvelte";
  import { writable } from "svelte/store";
  import "websocket-polyfill";
  const channel_id: string = $page.params.channel_id;

  // 取得したイベントを時系列で並べ替える
  const sorted = (events: Nostr.Event[]) => {
    return [...events].sort((a, b) => a.created_at - b.created_at);
  };

  const limitLists = [20, 50, 100];
  const selectedLimit = writable(20);
  let channelNameLoaded = false;
  let channelName = "";
  const initLoading = async () => {
    channelName = await getChannelMeta(channel_id);
    channelNameLoaded = true;
  };

  let postContent = "";
  let replyId: string | null = null;
  let parentEvent: Event<Kind.Text>;
  $: submitDisabled = !postContent.trim();

  const submit = async () => {
    const seckey = getSecKey();
    if (!seckey) {
      alert("投稿するには鍵の生成または登録が必要です");
      return;
    }
    const result = await post(postContent, channel_id, seckey, replyId);
    if (result) {
      postContent = "";
      replyId = null;
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

  initLoading();
</script>

<NavigationBar>
  <div slot="left">
    <a href="/">
      <img src="/left.svg" class="path" alt="" height="24px" />
    </a>
  </div>
  <div slot="right">
    <a href="/settings/keys">
      <img src="/gear.svg" class="path" alt="" height="24px" />
    </a>
  </div>
</NavigationBar>

<Modal>
  <div class="flex flex-between" slot="header">
    <h2></h2>
    <button on:click={() => modal.set(false)}>Close</button>
  </div>
  <div slot="content">
    <Post event={parentEvent} action={false}></Post>
  </div>
  <div slot="footer"></div>
</Modal>

<NostrApp {relays}>
  <UniqueEventList
    queryKey={["timeline", "feed"]}
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
    <div slot="loading" class="container">
      <p class="center">Loading...</p>
    </div>
    <div slot="error" let:error class="container">
      <p class="center">{error}</p>
    </div>
    <main>
      {#if channelNameLoaded}
        <h2 class="mb-2 ellipsis">
          {channelName ?? "タイトルなし"}
        </h2>
      {/if}
      <section>
        {#each sorted(events) as event (event.id)}
          <Metadata let:metadata pubkey={event.pubkey} queryKey={["user_meta", event.pubkey]} >
            <Post
              {event}
              {metadata}
              on:reply={(e) => (replyId = e.detail.id)}
              on:openReply={(e) => openReply(e.detail.id)}
            />
          </Metadata>
        {/each}
      </section>
      <form>
        {#if replyId}
          <p>リプライ &gt; {replyId}</p>
          <button on:click={() => (replyId = null)} type="button" class="small"
            >リプをキャンセル</button
          >
        {/if}
        <label>
          <textarea bind:value={postContent} on:keydown={submitKeydown} placeholder="最近どう？"
          ></textarea>
        </label>
        <button on:click={submit} type="button" disabled={submitDisabled}
          >書き込む</button
        >
      </form>
    </main>
  </UniqueEventList>
</NostrApp>
