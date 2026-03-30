<script lang="ts">
  export let message: string = "";
</script>

<div class="spinner-container">
  <div class="spinner"></div>
  {#if message}
    <p class="spinner-message">{message}</p>
  {/if}
</div>

<style>
  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--secondary-text, #666);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #e0e0e0);
    border-top-color: var(--primary-color, #059669);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner-message {
    margin-top: 12px;
    font-size: 0.875rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
