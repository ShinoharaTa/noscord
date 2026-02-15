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

<div class="chat-container flex flex-1 flex-col h-dvh bg-surface-chat overflow-hidden">
  <div
    class="chat-content flex-1 overflow-y-auto w-full h-full"
    class:flex={isChatPage}
    class:flex-col={isChatPage}
  >
    <slot />
  </div>
</div> 