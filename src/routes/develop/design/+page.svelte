<script lang="ts">
  import Icon from "$lib/components/icons.svelte";
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
    Heart,
    Share,
    Bookmark,
    Bell,
    User,
    Search,
    Filter,
    Download,
    Upload,
    Eye,
    Lock,
    Globe,
    Home,
    ChevronRight,
    Calendar,
    Clock,
    Star,
    ThumbsUp,
    Edit,
    Trash2,
    Copy,
    ExternalLink
  } from 'lucide-svelte';

  // 現在のアイコンマッピング
  const currentIcons = [
    { name: 'refresh', label: 'リフレッシュ' },
    { name: 'plus', label: 'プラス' },
    { name: 'send', label: '送信' },
    { name: 'chat', label: 'チャット' },
    { name: 'key', label: 'キー' },
    { name: 'info', label: '情報' },
    { name: 'menu', label: 'メニュー' },
    { name: 'x', label: '閉じる' },
    { name: 'gear', label: '設定' },
    { name: 'reply', label: 'リプライ' },
  ];

  // Lucideアイコンマッピング
  const lucideIcons = [
    { component: RefreshCw, name: 'RefreshCw', label: 'リフレッシュ', category: '現在使用中' },
    { component: Plus, name: 'Plus', label: 'プラス', category: '現在使用中' },
    { component: Send, name: 'Send', label: '送信', category: '現在使用中' },
    { component: MessageCircle, name: 'MessageCircle', label: 'チャット', category: '現在使用中' },
    { component: Key, name: 'Key', label: 'キー', category: '現在使用中' },
    { component: Info, name: 'Info', label: '情報', category: '現在使用中' },
    { component: Menu, name: 'Menu', label: 'メニュー', category: '現在使用中' },
    { component: X, name: 'X', label: '閉じる', category: '現在使用中' },
    { component: Settings, name: 'Settings', label: '設定', category: '現在使用中' },
    { component: Reply, name: 'Reply', label: 'リプライ', category: '現在使用中' },
    
    { component: Heart, name: 'Heart', label: 'いいね', category: '拡張候補' },
    { component: Share, name: 'Share', label: '共有', category: '拡張候補' },
    { component: Bookmark, name: 'Bookmark', label: 'ブックマーク', category: '拡張候補' },
    { component: Bell, name: 'Bell', label: '通知', category: '拡張候補' },
    { component: User, name: 'User', label: 'ユーザー', category: '拡張候補' },
    { component: Search, name: 'Search', label: '検索', category: '拡張候補' },
    { component: Filter, name: 'Filter', label: 'フィルター', category: '拡張候補' },
    { component: Download, name: 'Download', label: 'ダウンロード', category: '拡張候補' },
    { component: Upload, name: 'Upload', label: 'アップロード', category: '拡張候補' },
    { component: Eye, name: 'Eye', label: '表示', category: '拡張候補' },
    { component: Lock, name: 'Lock', label: 'プライベート', category: '拡張候補' },
    { component: Globe, name: 'Globe', label: 'パブリック', category: '拡張候補' },
    
    { component: Home, name: 'Home', label: 'ホーム', category: 'ナビゲーション' },
    { component: ChevronRight, name: 'ChevronRight', label: '右矢印', category: 'ナビゲーション' },
    { component: Calendar, name: 'Calendar', label: 'カレンダー', category: 'ナビゲーション' },
    { component: Clock, name: 'Clock', label: '時間', category: 'ナビゲーション' },
    { component: Star, name: 'Star', label: 'スター', category: 'アクション' },
    { component: ThumbsUp, name: 'ThumbsUp', label: 'いいね', category: 'アクション' },
    { component: Edit, name: 'Edit', label: '編集', category: 'アクション' },
    { component: Trash2, name: 'Trash2', label: '削除', category: 'アクション' },
    { component: Copy, name: 'Copy', label: 'コピー', category: 'アクション' },
    { component: ExternalLink, name: 'ExternalLink', label: '外部リンク', category: 'アクション' },
  ];

  // カテゴリー別にグループ化
  const groupedLucideIcons = lucideIcons.reduce((acc, icon) => {
    if (!acc[icon.category]) {
      acc[icon.category] = [];
    }
    acc[icon.category].push(icon);
    return acc;
  }, {} as Record<string, typeof lucideIcons>);

  // サイズオプション
  const sizes = [12, 16, 20, 24, 32, 48];
  let selectedSize = 24;
</script>

<svelte:head>
  <title>Design System - Noscord</title>
  <meta name="description" content="Noscordのデザインシステムとコンポーネント一覧" />
</svelte:head>

<div class="design-page">
  <div class="design-container">
    <!-- ナビゲーション -->
    <nav class="design-nav">
      <button class="nav-back" on:click={() => window.history.back()}>
        <ChevronRight size={16} style="transform: rotate(180deg);" />
        戻る
      </button>
      <div class="nav-title">Design System</div>
      <div class="nav-actions">
        <a href="/" class="nav-link">ホーム</a>
      </div>
    </nav>

    <!-- ヘッダー -->
    <header class="design-header">
      <h1>🎨 Design System</h1>
      <p>Noscordのデザインシステム、アイコン、コンポーネント一覧</p>
    </header>

    <!-- アイコン比較セクション -->
    <section class="design-section">
      <h2>📦 アイコン比較</h2>
      
      <div class="comparison-grid">
        <!-- 現在のアイコン (Lucideベース) -->
        <div class="icon-group">
          <h3>現在のアイコン (Lucideベース) ✨</h3>
          <div class="icon-grid">
            {#each currentIcons as icon}
              <div class="icon-item">
                <div class="icon-display">
                  <Icon name={icon.name} size={selectedSize} />
                </div>
                <div class="icon-info">
                  <span class="icon-name">{icon.name}</span>
                  <span class="icon-label">{icon.label}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Lucideアイコン -->
        <div class="icon-group">
          <h3>Lucide Icons (推奨)</h3>
          <div class="size-selector">
            <label for="size-select">サイズ:</label>
            <select id="size-select" bind:value={selectedSize}>
              {#each sizes as size}
                <option value={size}>{size}px</option>
              {/each}
            </select>
          </div>
          
          {#each Object.entries(groupedLucideIcons) as [category, icons]}
            <div class="icon-category">
              <h4>{category}</h4>
              <div class="icon-grid">
                {#each icons as icon}
                  <div class="icon-item">
                    <div class="icon-display">
                      <svelte:component this={icon.component} size={selectedSize} />
                    </div>
                    <div class="icon-info">
                      <span class="icon-name">{icon.name}</span>
                      <span class="icon-label">{icon.label}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- カラーパレット -->
    <section class="design-section">
      <h2>🎨 カラーパレット</h2>
      <div class="color-palette">
        <div class="color-group">
          <h3>プライマリカラー</h3>
          <div class="color-items">
            <div class="color-item">
              <div class="color-swatch primary"></div>
              <span>Primary: #059669</span>
            </div>
            <div class="color-item">
              <div class="color-swatch primary-hover"></div>
              <span>Primary Hover: #047857</span>
            </div>
          </div>
        </div>
        
        <div class="color-group">
          <h3>テキストカラー</h3>
          <div class="color-items">
            <div class="color-item">
              <div class="color-swatch text-primary"></div>
              <span>Primary Text: #1a1d21</span>
            </div>
            <div class="color-item">
              <div class="color-swatch text-secondary"></div>
              <span>Secondary Text: #6c757d</span>
            </div>
            <div class="color-item">
              <div class="color-swatch text-muted"></div>
              <span>Muted Text: #adb5bd</span>
            </div>
          </div>
        </div>
        
        <div class="color-group">
          <h3>背景カラー</h3>
          <div class="color-items">
            <div class="color-item">
              <div class="color-swatch bg-primary"></div>
              <span>Primary BG: #ffffff</span>
            </div>
            <div class="color-item">
              <div class="color-swatch bg-secondary"></div>
              <span>Secondary BG: #f8f9fa</span>
            </div>
            <div class="color-item">
              <div class="color-swatch bg-card"></div>
              <span>Card BG: #ffffff</span>
            </div>
          </div>
        </div>

        <div class="color-group">
          <h3>状態カラー</h3>
          <div class="color-items">
            <div class="color-item">
              <div class="color-swatch success"></div>
              <span>Success: #059669</span>
            </div>
            <div class="color-item">
              <div class="color-swatch error"></div>
              <span>Error: #dc3545</span>
            </div>
            <div class="color-item">
              <div class="color-swatch warning"></div>
              <span>Warning: #ffc107</span>
            </div>
            <div class="color-item">
              <div class="color-swatch info"></div>
              <span>Info: #0dcaf0</span>
            </div>
          </div>
        </div>

        <div class="color-group">
          <h3>ボーダー・その他</h3>
          <div class="color-items">
            <div class="color-item">
              <div class="color-swatch border"></div>
              <span>Border: #e3e5e8</span>
            </div>
            <div class="color-item">
              <div class="color-swatch disabled"></div>
              <span>Disabled: #adb5bd</span>
            </div>
            <div class="color-item">
              <div class="color-swatch hover"></div>
              <span>Hover BG: #f8f9fa</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- コンポーネント一覧 -->
    <section class="design-section">
      <h2>🧩 コンポーネント一覧</h2>
      
      <div class="component-group">
        <h3>ボタン</h3>
        <div class="component-samples">
          <div class="component-item">
            <div class="sample-label">プライマリボタン</div>
            <button class="btn btn-primary">
              <Plus size={16} />
              プライマリボタン
            </button>
          </div>
          <div class="component-item">
            <div class="sample-label">セカンダリボタン</div>
            <button class="btn btn-secondary">
              <Plus size={16} />
              セカンダリボタン
            </button>
          </div>
          <div class="component-item">
            <div class="sample-label">危険ボタン</div>
            <button class="btn btn-danger">
              <Plus size={16} />
              危険ボタン
            </button>
          </div>
          <div class="component-item">
            <div class="sample-label">無効ボタン</div>
            <button class="btn btn-disabled" disabled>
              <Plus size={16} />
              無効ボタン
            </button>
          </div>
        </div>
      </div>

      <div class="component-group">
        <h3>インプット</h3>
        <div class="component-samples">
          <div class="component-item">
            <div class="sample-label">テキスト入力</div>
            <input type="text" placeholder="テキストを入力" class="form-input" />
          </div>
          <div class="component-item">
            <div class="sample-label">パスワード</div>
            <input type="password" placeholder="パスワード" class="form-input" />
          </div>
          <div class="component-item">
            <div class="sample-label">メール</div>
            <input type="email" placeholder="email@example.com" class="form-input" />
          </div>
          <div class="component-item">
            <div class="sample-label">無効入力</div>
            <input type="text" placeholder="無効な入力" class="form-input" disabled />
          </div>
        </div>
      </div>
    </section>

    <!-- タイポグラフィ -->
    <section class="design-section">
      <h2>📝 タイポグラフィ - Noto Sans</h2>
      <div class="font-info">
        <p><strong>フォントファミリー:</strong> Noto Sans JP, Noto Sans, system-ui</p>
        <p><strong>特徴:</strong> Googleが開発した美しく読みやすいフォント。日本語と英語の調和が取れたデザイン。</p>
      </div>
      
      <div class="typography-samples">
        <div class="typography-item">
          <h1 style="font-weight: var(--font-weight-bold); font-size: var(--font-size-3xl);">見出し1 - Noto Sans Bold</h1>
          <span class="typography-info">30px / 700 weight - メインタイトル用</span>
        </div>
        <div class="typography-item">
          <h2 style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-2xl);">見出し2 - Noto Sans SemiBold</h2>
          <span class="typography-info">24px / 600 weight - セクションタイトル用</span>
        </div>
        <div class="typography-item">
          <h3 style="font-weight: var(--font-weight-medium); font-size: var(--font-size-xl);">見出し3 - Noto Sans Medium</h3>
          <span class="typography-info">20px / 500 weight - サブセクション用</span>
        </div>
        <div class="typography-item">
          <p style="font-weight: var(--font-weight-normal); font-size: var(--font-size-base);">本文テキスト - これは日本語と English が混在したテキストです。Noto Sansは両言語で美しく表示されます。</p>
          <span class="typography-info">16px / 400 weight - 本文用</span>
        </div>
        <div class="typography-item">
          <p style="font-weight: var(--font-weight-normal); font-size: var(--font-size-sm); color: var(--muted-text);">小さなテキスト - 補足情報やメタデータ用</p>
          <span class="typography-info">14px / 400 weight - 補足情報用</span>
        </div>
        <div class="typography-item">
          <p style="font-weight: var(--font-weight-light); font-size: var(--font-size-base);">軽いウェイト - Noto Sans Light で上品な印象</p>
          <span class="typography-info">16px / 300 weight - 軽やかな表現用</span>
        </div>
      </div>
      
      <!-- フォントウェイト比較 -->
      <div class="font-weights">
        <h3>フォントウェイト比較</h3>
        <div class="weight-samples">
          <div class="weight-item">
            <span style="font-weight: var(--font-weight-light);">Light (300) - 軽やか</span>
          </div>
          <div class="weight-item">
            <span style="font-weight: var(--font-weight-normal);">Normal (400) - 標準</span>
          </div>
          <div class="weight-item">
            <span style="font-weight: var(--font-weight-medium);">Medium (500) - 中程度</span>
          </div>
          <div class="weight-item">
            <span style="font-weight: var(--font-weight-semibold);">SemiBold (600) - やや太字</span>
          </div>
          <div class="weight-item">
            <span style="font-weight: var(--font-weight-bold);">Bold (700) - 太字</span>
          </div>
        </div>
      </div>
    </section>

    <!-- スペーシング -->
    <section class="design-section">
      <h2>📏 スペーシング</h2>
      <div class="spacing-samples">
        <div class="spacing-item">
          <div class="spacing-demo" style="padding: 4px; background: #e3f2fd;">4px</div>
        </div>
        <div class="spacing-item">
          <div class="spacing-demo" style="padding: 8px; background: #e3f2fd;">8px</div>
        </div>
        <div class="spacing-item">
          <div class="spacing-demo" style="padding: 12px; background: #e3f2fd;">12px</div>
        </div>
        <div class="spacing-item">
          <div class="spacing-demo" style="padding: 16px; background: #e3f2fd;">16px</div>
        </div>
        <div class="spacing-item">
          <div class="spacing-demo" style="padding: 24px; background: #e3f2fd;">24px</div>
        </div>
        <div class="spacing-item">
          <div class="spacing-demo" style="padding: 32px; background: #e3f2fd;">32px</div>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .design-page {
    background: var(--bg-primary);
    color: var(--text-color);
    width: 100%;
    height: auto;
  }

  .design-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: var(--space-6);
  }

  .nav-back {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    transition: all 0.2s;
  }

  .nav-back:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
  }

  .nav-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--primary-text);
  }

  .nav-actions {
    display: flex;
    gap: var(--space-3);
  }

  .nav-link {
    color: var(--primary-color);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    transition: background-color 0.2s;
  }

  .nav-link:hover {
    background: var(--hover-bg);
  }

  .design-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-6);
  }

  .design-header {
    text-align: center;
    margin-bottom: var(--space-10);
    padding-bottom: var(--space-6);
    border-bottom: 2px solid var(--border-color);
  }

  .design-header h1 {
    font-size: var(--font-size-3xl);
    margin-bottom: var(--space-3);
    color: var(--primary-color);
  }

  .design-header p {
    font-size: var(--font-size-lg);
    color: var(--secondary-text);
  }

  .design-section {
    margin-bottom: var(--space-10);
  }

  .design-section h2 {
    font-size: var(--font-size-2xl);
    margin-bottom: var(--space-6);
    color: var(--primary-text);
    border-left: 4px solid var(--primary-color);
    padding-left: var(--space-4);
  }

  /* アイコン比較 */
  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }

  .icon-group {
    background: var(--bg-secondary);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }

  .icon-group h3 {
    margin-bottom: var(--space-4);
    color: var(--primary-text);
  }

  .size-selector {
    margin-bottom: var(--space-5);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .size-selector select {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--input-bg);
    color: var(--text-color);
  }

  .icon-category {
    margin-bottom: var(--space-6);
  }

  .icon-category h4 {
    margin-bottom: var(--space-3);
    color: var(--primary-color);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-4);
  }

  .icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-3);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: all 0.2s;
  }

  .icon-item:hover {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
  }

  .icon-display {
    margin-bottom: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
  }

  .icon-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .icon-name {
    font-size: var(--font-size-xs);
    color: var(--secondary-text);
    font-family: monospace;
  }

  .icon-label {
    font-size: var(--font-size-sm);
    color: var(--primary-text);
    margin-top: 2px;
  }

  /* カラーパレット */
  .color-palette {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-6);
  }

  .color-group h3 {
    margin-bottom: var(--space-4);
    color: var(--primary-text);
  }

  .color-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .color-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .color-swatch {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .color-swatch.primary { background: #059669; }
  .color-swatch.primary-hover { background: #047857; }
  .color-swatch.text-primary { background: #1a1d21; }
  .color-swatch.text-secondary { background: #6c757d; }
  .color-swatch.text-muted { background: #adb5bd; }
  .color-swatch.bg-primary { background: #ffffff; }
  .color-swatch.bg-secondary { background: #f8f9fa; }
  .color-swatch.bg-card { background: #ffffff; }
  .color-swatch.success { background: #059669; }
  .color-swatch.error { background: #dc3545; }
  .color-swatch.warning { background: #ffc107; }
  .color-swatch.info { background: #0dcaf0; }
  .color-swatch.border { background: #e3e5e8; }
  .color-swatch.disabled { background: #adb5bd; }
  .color-swatch.hover { background: #f8f9fa; }

  /* コンポーネント */
  .component-group {
    margin-bottom: var(--space-8);
  }

  .component-group h3 {
    margin-bottom: var(--space-4);
    color: var(--primary-text);
  }

  .component-samples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .component-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
  }

  .sample-label {
    font-size: var(--font-size-sm);
    color: var(--secondary-text);
    font-weight: var(--font-weight-medium);
  }

  /* ボタンスタイル */
  .btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
    box-shadow: var(--shadow-sm);
  }

  .btn-primary:hover {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--primary-text);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
  }

  .btn-danger {
    background: var(--danger-color);
    color: white;
    box-shadow: var(--shadow-sm);
  }

  .btn-danger:hover {
    background: var(--danger-color-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-disabled {
    background: var(--disabled-bg);
    color: var(--disabled-text);
    cursor: not-allowed;
  }

  /* フォーム */
  .form-input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--input-bg);
    color: var(--text-color);
    transition: border-color 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-alpha);
  }

  /* タイポグラフィ */
  .font-info {
    background: var(--bg-secondary);
    padding: var(--space-5);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    border-left: 4px solid var(--primary-color);
  }

  .font-info p {
    margin: var(--space-2) 0;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }

  .typography-samples {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .typography-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* スペーシング */
  .spacing-samples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-4);
  }

  .spacing-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .spacing-demo {
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
    background: var(--primary-color-alpha);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* レスポンシブ */
  @media (max-width: 768px) {
    .comparison-grid {
      grid-template-columns: 1fr;
    }

    .design-container {
      padding: var(--space-4);
    }

    .icon-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }

    .component-samples {
      grid-template-columns: 1fr;
    }
  }
</style> 