<script lang="ts">
  import { 
    RefreshCw, 
    Plus, 
    Send, 
    MessageCircle, 
    Key, 
    Info, 
    Menu, 
    X, 
    Settings,
    Reply,
    Eye,
    EyeOff
  } from 'lucide-svelte';

  export let name: string;
  export let size: number = 16;
  let className: string = "";
  export { className as class };

  // アイコンマッピング
  const iconMap = {
    refresh: RefreshCw,
    plus: Plus,
    send: Send,
    chat: MessageCircle,
    key: Key,
    info: Info,
    menu: Menu,
    x: X,
    gear: Settings,
    reply: Reply,
    eye: Eye,
    'eye-off': EyeOff
  };

  $: IconComponent = iconMap[name as keyof typeof iconMap];
</script>

{#if IconComponent}
  <svelte:component 
    this={IconComponent} 
    {size} 
    class={`icon ${className}`}
  />
{:else}
  <!-- フォールバック用の汎用アイコン -->
  <div class={`icon fallback ${className}`} style="width: {size}px; height: {size}px;">
    ?
  </div>
{/if}

<style>
  :global(.icon) {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }

  .fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--text-muted);
    color: var(--bg-primary);
    border-radius: 2px;
    font-size: 12px;
    font-weight: bold;
  }
</style> 