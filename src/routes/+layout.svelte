<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "../styles/style.scss";
  import Sidebar from "$lib/components/sidebar.svelte";
  import ChatArea from "$lib/components/chat-area.svelte";
  import SettingsModal from "$lib/components/settings-modal.svelte";
  import Icon from "$lib/components/icons.svelte";

  let sidebarOpen = false;

  onMount(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch(() => {
          // ServiceWorker registration failed - not critical for functionality
        });
    }

    // 初期化時とリサイズ時のサイドバー状態管理
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        sidebarOpen = true;
      } else {
        sidebarOpen = false;
      }
    };

    handleResize(); // 初期化
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<div class="app-layout">
  <Sidebar bind:isOpen={sidebarOpen} />
  <ChatArea bind:sidebarOpen>
    <slot />
  </ChatArea>
  
  <!-- モバイル・タブレット用の閉じるボタン -->
  {#if sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024}
    <button class="mobile-close-btn" on:click={() => sidebarOpen = false}>
      <Icon name="x" size={24} />
    </button>
  {/if}
</div>

<!-- 設定モーダル -->
<SettingsModal />

<style>
  .app-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  @media (max-width: 1023px) {
    .app-layout {
      flex-direction: row;
    }
  }

  .mobile-close-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1001;
    background: var(--sidebar-bg, #1a1d21);
    border: 1px solid var(--border-color, #333);
    color: var(--sidebar-text, #fff);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .mobile-close-btn:hover {
    background: var(--hover-bg, #2a2d31);
  }
</style>
