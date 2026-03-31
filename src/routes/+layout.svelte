<script lang="ts">
  import { onMount } from "svelte";
  import "../styles/app.css";
  import "../styles/style.scss";
  import Sidebar from "$lib/components/sidebar.svelte";
  import ChatArea from "$lib/components/chat-area.svelte";
  import SettingsModal from "$lib/components/settings-modal.svelte";

  let sidebarOpen = false;

  onMount(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch(() => {});
    }

    const handleResize = () => {
      sidebarOpen = window.innerWidth >= 768;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<div class="flex h-dvh overflow-hidden relative pt-[env(safe-area-inset-top)]">
  <Sidebar bind:isOpen={sidebarOpen} />
  <ChatArea bind:sidebarOpen>
    <slot />
  </ChatArea>
</div>

<SettingsModal />
