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
    EyeOff,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Smile,
    Loader,
    Star,
    Image,
    Search,
    Share2,
    Users,
    Copy,
    Check,
    Globe,
    CheckCircle,
    XCircle,
    Link,
    Unlink,
    Home
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
    'eye-off': EyeOff,
    trash: Trash2,
    left: ChevronLeft,
    right: ChevronRight,
    smile: Smile,
    loader: Loader,
    star: Star,
    image: Image,
    search: Search,
    down: ChevronDown,
    share: Share2,
    users: Users,
    copy: Copy,
    check: Check,
    globe: Globe,
    'check-circle': CheckCircle,
    'x-circle': XCircle,
    link: Link,
    unlink: Unlink,
    home: Home
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
  <div class={`icon flex items-center justify-center bg-foreground-muted text-surface rounded-sm text-xs font-bold ${className}`} style="width: {size}px; height: {size}px;">
    ?
  </div>
{/if}

<style>
  :global(.icon) {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style> 