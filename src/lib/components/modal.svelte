<script lang="ts">
  import { modal } from "$lib/store";
  import { onDestroy, onMount } from "svelte";

  let isOpen = false;

  const handleClose = () => {
    isOpen = false;
    modal.set(false); // モーダルを閉じるときにstoreをクリア
  };

  const handleOverlayKeydown = (event: KeyboardEvent) => {
    // Enter / Space で閉じる（A11y）
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClose();
    }
  };

  $: {
    const unsubscribe = modal.subscribe((value) => {
      isOpen = !!value;
    });

    onDestroy(() => {
      unsubscribe();
    });
  }

  // モーダルが開かれているときにスクロールを禁止
  onMount(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-black/50 z-[var(--z-modal-overlay)]"
    role="button"
    aria-label="モーダルを閉じる"
    tabindex="0"
    on:click={handleClose}
    on:keydown={handleOverlayKeydown}
  ></div>
  <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-modal p-5 rounded-xl z-[var(--z-modal)] max-h-[80vh] max-w-[600px] w-[calc(100vw-20px)] flex flex-col overflow-hidden border border-border shadow-lg">
    <div class="shrink-0">
      <slot name="header"></slot>
    </div>
    <div class="flex-1 overflow-y-auto min-h-0">
      <slot name="content"></slot>
    </div>
    <div class="shrink-0">
      <slot name="footer"></slot>
    </div>
  </div>
{/if}
