<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Icon from "$lib/components/icons.svelte";
  
  export let sidebarOpen = false;
  
  // ページタイプを判別
  $: isChatPage = $page.route.id?.includes('[channel_id]');

  onMount(() => {
    const handleToggleSidebar = () => {
      sidebarOpen = true;
    };

    document.addEventListener('toggleSidebar', handleToggleSidebar);

    return () => {
      document.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  });
</script>

<div class="chat-container">
  <div class="chat-content" class:chat-content-page={isChatPage}>
    <slot />
  </div>
</div>

<style>
  .chat-container {
    flex: 1;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--chat-bg);
    overflow: hidden;
  }

  .chat-content {
    flex: 1;
    overflow-y: auto;
    width: 100%;
    height: 100%;
  }

  /* チャットページ専用のスタイル */
  .chat-content.chat-content-page {
    display: flex;
    flex-direction: column;
  }
</style> 