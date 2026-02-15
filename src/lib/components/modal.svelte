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
    class="overlay"
    role="button"
    aria-label="モーダルを閉じる"
    tabindex="0"
    on:click={handleClose}
    on:keydown={handleOverlayKeydown}
  ></div>
  <div class="modal">
    <div class="header">
      <slot name="header"></slot>
    </div>
    <div class="content">
      <slot name="content"></slot>
    </div>
    <div class="footer">
      <slot name="footer"></slot>
    </div>
  </div>
{/if}
