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

    // レスポンシブ対応のサイドバー制御
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        sidebarOpen = true;
      } else {
        sidebarOpen = false;
      }
    };

    // 初期状態を設定
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // サイドバーオーバーレイのクリックで閉じる
  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      sidebarOpen = false;
    }
  };
</script>

<div class="app-layout">
  <Sidebar bind:isOpen={sidebarOpen} />
  <ChatArea bind:sidebarOpen>
    <slot />
  </ChatArea>
</div>

<!-- モバイル用オーバーレイ：統一された実装 -->
{#if sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 768}
  <div class="sidebar-overlay" on:click={closeSidebar}></div>
{/if}

<!-- 設定モーダル -->
<SettingsModal />

<style>
  .app-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  @media (max-width: 767px) {
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
