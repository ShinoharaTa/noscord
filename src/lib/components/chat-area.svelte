<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/icons.svelte";
  
  export let sidebarOpen = false;

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

  
  <div class="chat-content">
    <slot />
  </div>
</div>

<style>
  .chat-container {
    flex: 1;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--chat-bg, #ffffff);
  }



  .chat-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }



  @media (prefers-color-scheme: dark) {
    .chat-container {
      --chat-bg: #36393f;
      --text-color: #dcddde;
      --border-color: #42464d;
      --hover-bg: #42464d;
    }
  }
</style> 