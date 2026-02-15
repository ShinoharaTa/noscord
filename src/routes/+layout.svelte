<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "../styles/app.css";
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

  const handleOverlayKeydown = (event: KeyboardEvent) => {
    // Enter / Space で閉じる（A11y）
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeSidebar();
    }
  };
</script>

<div class="flex h-dvh overflow-hidden relative pt-[env(safe-area-inset-top)]">
  <Sidebar bind:isOpen={sidebarOpen} />
  <ChatArea bind:sidebarOpen>
    <slot />
  </ChatArea>
</div>

<!-- モバイル用オーバーレイ：統一された実装 -->
{#if sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 768}
  <div
    class="fixed inset-0 bg-black/50 z-[var(--z-sidebar-overlay)] md:hidden"
    role="button"
    aria-label="サイドバーを閉じる"
    tabindex="0"
    on:click={closeSidebar}
    on:keydown={handleOverlayKeydown}
  ></div>
{/if}

<!-- 設定モーダル -->
<SettingsModal />
