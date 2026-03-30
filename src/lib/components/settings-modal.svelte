<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { 
    settingsModal, 
    getSecKey, 
    saveToIdentifiedKey, 
    removeIdentifiedKey,
    checkNip07Availability,
    getNip07PublicKey,
    setUseNip07,
    getUseNip07,
    nip07Available,
    nip07PubKey,
    useNip07
  } from '$lib/store';
  import { getRelays, addRelay, removeRelay } from '$lib/nostr';
  import { generateSecretKey } from 'nostr-tools';
  import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
  import { nip19 } from 'nostr-tools';
  import Icon from './icons.svelte';

  type Section = 'keys' | 'nip07' | 'relays' | 'about';
  let activeSection: Section = 'keys';

  let secretKey = '';
  let showSecretKey = false;
  let nip07PublicKey = '';
  let loadingNip07 = false;

  let currentRelays: string[] = [];
  let newRelayUrl = '';

  const sections: { id: Section; icon: string; label: string; desc: string }[] = [
    { id: 'keys', icon: 'key', label: '秘密鍵', desc: '鍵の管理と生成' },
    { id: 'nip07', icon: 'globe', label: 'ブラウザ拡張機能', desc: 'NIP-07 署名連携' },
    { id: 'relays', icon: 'share', label: 'リレー', desc: '接続先の管理' },
    { id: 'about', icon: 'info', label: 'アプリ情報', desc: 'バージョンとライセンス' },
  ];

  const selectSection = (id: Section) => {
    activeSection = id;
  };

  onMount(() => {
    const initialize = async () => {
      const existingKey = getSecKey();
      if (existingKey) {
        try {
          secretKey = nip19.nsecEncode(hexToBytes(existingKey));
        } catch {
          secretKey = existingKey;
        }
      }
      checkNip07Availability();
      currentRelays = getRelays();
      if ($nip07Available && $useNip07) {
        await loadNip07PublicKey();
      }
    };
    void initialize();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && $settingsModal) {
        settingsModal.set(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    };
  });

  $: if (typeof document !== 'undefined') {
    if ($settingsModal) {
      document.body.style.overflow = 'hidden';
      currentRelays = getRelays();
    } else {
      document.body.style.overflow = '';
    }
  }

  const saveSecretKey = () => {
    try {
      let hexKey = '';
      if (secretKey.startsWith('nsec1')) {
        const decoded = nip19.decode(secretKey);
        hexKey = bytesToHex(decoded.data as Uint8Array);
      } else if (secretKey.length === 64) {
        hexKey = secretKey;
      } else {
        alert('秘密鍵はnsec1形式または64文字のHex形式で入力してください');
        return;
      }
      saveToIdentifiedKey(hexKey);
      alert('秘密鍵を保存しました');
    } catch {
      alert('秘密鍵の形式が正しくありません');
    }
  };

  const generateNewKey = () => {
    const secretKeyBytes = generateSecretKey();
    const hexKey = bytesToHex(secretKeyBytes);
    secretKey = nip19.nsecEncode(hexToBytes(hexKey));
  };

  const toggleSecretKeyVisibility = () => {
    showSecretKey = !showSecretKey;
  };

  const deleteSecretKey = () => {
    if (confirm('本当に秘密鍵を削除しますか？\n\nこの操作は取り消せません。')) {
      removeIdentifiedKey();
      secretKey = '';
    }
  };

  const loadNip07PublicKey = async () => {
    if (!$nip07Available) return;
    loadingNip07 = true;
    try {
      const pubkey = await getNip07PublicKey();
      if (pubkey) nip07PublicKey = pubkey;
    } catch {
      alert('ブラウザ拡張機能から公開鍵を取得できませんでした。');
    } finally {
      loadingNip07 = false;
    }
  };

  const connectNip07 = async () => {
    if (!$nip07Available) {
      alert('NIP-07対応のブラウザ拡張機能が見つかりません。');
      return;
    }
    await loadNip07PublicKey();
    if (nip07PublicKey) {
      setUseNip07(true);
      alert('接続完了しました。');
    }
  };

  const disconnectNip07 = () => {
    setUseNip07(false);
    nip07PublicKey = '';
  };

  const handleAddRelay = () => {
    const url = newRelayUrl.trim();
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      alert('リレーURLは wss:// または ws:// で始まる必要があります');
      return;
    }
    addRelay(url);
    currentRelays = getRelays();
    newRelayUrl = '';
  };

  const handleRemoveRelay = (url: string) => {
    removeRelay(url);
    currentRelays = getRelays();
  };

  const closeSettings = () => settingsModal.set(false);
</script>

{#if $settingsModal}
  <div class="settings-screen" transition:fly={{ y: 20, duration: 200 }}>
    <!-- 共通ヘッダー -->
    <header class="settings-header">
      <button class="back-btn" on:click={closeSettings}>
        <Icon name="left" size={20} />
        <span>戻る</span>
      </button>
      <h1 class="header-title">設定</h1>
      <!-- モバイルのみ: 右側にスペーサー -->
      <div class="header-spacer"></div>
    </header>

    <div class="settings-body">
      <!-- 左ペイン: ナビゲーション -->
      <nav class="settings-nav">
        <div class="nav-list">
          {#each sections as section}
            <button
              class="nav-item"
              class:active={activeSection === section.id}
              on:click={() => selectSection(section.id)}
            >
              <div class="nav-icon-wrap" class:active={activeSection === section.id}>
                <Icon name={section.icon} size={18} />
              </div>
              <div class="nav-text">
                <span class="nav-label">{section.label}</span>
                <span class="nav-desc">{section.desc}</span>
              </div>
              <Icon name="right" size={14} class="nav-chevron" />
            </button>
          {/each}
        </div>
      </nav>

      <!-- 右ペイン: 詳細 -->
      <main class="settings-main">
        <!-- モバイルタブ -->
        <div class="mobile-tabs">
          {#each sections as section}
            <button
              class="mobile-tab"
              class:active={activeSection === section.id}
              on:click={() => selectSection(section.id)}
            >
              <Icon name={section.icon} size={14} />
              <span>{section.label}</span>
            </button>
          {/each}
        </div>

        <div class="main-scroll">
          {#if activeSection === 'keys'}
            <div class="section-header">
              <h2>秘密鍵の管理</h2>
              <p>Nostrで使用する秘密鍵の設定と管理を行います。</p>
            </div>

            <div class="card">
              <div class="card-body">
                <label class="field-label" for="secret-key">秘密鍵 (nsec1形式)</label>
                <div class="input-wrap">
                  <input
                    id="secret-key"
                    type="text"
                    bind:value={secretKey}
                    placeholder="nsec1... または64文字のHex"
                    class="field-input mono"
                    class:masked={!showSecretKey}
                    autocomplete="off"
                  />
                  <button class="input-action" on:click={toggleSecretKeyVisibility} title={showSecretKey ? '非表示' : '表示'}>
                    <Icon name={showSecretKey ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                <p class="field-hint">nsec1形式（推奨）または64文字のHex形式</p>
              </div>
              <div class="card-footer">
                <button class="btn btn-primary" on:click={saveSecretKey}>
                  <Icon name="check" size={15} /><span>保存</span>
                </button>
                <button class="btn btn-ghost" on:click={generateNewKey}>
                  <Icon name="refresh" size={15} /><span>新しい鍵を生成</span>
                </button>
                {#if secretKey}
                  <button class="btn btn-danger-ghost" on:click={deleteSecretKey}>
                    <Icon name="trash" size={15} /><span>削除</span>
                  </button>
                {/if}
              </div>
            </div>

            <div class="notice notice-warn">
              <Icon name="info" size={15} />
              <div>
                <strong>重要</strong>
                <p>秘密鍵は安全に保管してください。紛失するとアカウントにアクセスできなくなります。</p>
              </div>
            </div>

          {:else if activeSection === 'nip07'}
            <div class="section-header">
              <h2>ブラウザ拡張機能</h2>
              <p>nos2x等のNIP-07拡張機能を使って安全に署名できます。</p>
            </div>

            <div class="card">
              <div class="card-row">
                <span class="row-label">拡張機能</span>
                <span class="row-value">
                  {#if $nip07Available}
                    <span class="status-dot status-ok"></span> 利用可能
                  {:else}
                    <span class="status-dot status-ng"></span> 未検出
                  {/if}
                </span>
              </div>
              <div class="card-row">
                <span class="row-label">接続状態</span>
                <span class="row-value">
                  {#if $useNip07}
                    <span class="status-dot status-ok"></span> 接続中
                  {:else}
                    <span class="status-dot status-idle"></span> 未接続
                  {/if}
                </span>
              </div>
              {#if $useNip07 && (nip07PublicKey || $nip07PubKey)}
                <div class="card-row mono-value">
                  <span class="row-label">公開鍵</span>
                  <span class="row-value mono">{(nip07PublicKey || $nip07PubKey || '').slice(0, 24)}...</span>
                </div>
              {/if}
            </div>

            {#if $nip07Available}
              <div class="btn-area">
                {#if $useNip07}
                  <button class="btn btn-ghost" on:click={disconnectNip07}>
                    <Icon name="unlink" size={15} /><span>接続を解除</span>
                  </button>
                {:else}
                  <button class="btn btn-primary" on:click={connectNip07} disabled={loadingNip07}>
                    {#if loadingNip07}
                      <Icon name="loader" size={15} /><span>接続中...</span>
                    {:else}
                      <Icon name="link" size={15} /><span>拡張機能と接続</span>
                    {/if}
                  </button>
                {/if}
              </div>
            {:else}
              <div class="notice notice-info">
                <Icon name="info" size={15} />
                <div>
                  <strong>推奨</strong>
                  <p>nos2x等のNIP-07対応ブラウザ拡張機能をインストールすると、秘密鍵をアプリに渡さずに署名できます。</p>
                </div>
              </div>
            {/if}

          {:else if activeSection === 'relays'}
            <div class="section-header">
              <h2>リレー設定</h2>
              <p>Nostrイベントの送受信に使うリレーサーバーを管理します。</p>
            </div>

            <div class="card">
              {#each currentRelays as relay, i}
                <div class="card-row relay-row">
                  <span class="row-value mono relay-url-text">{relay}</span>
                  <button class="row-action" on:click={() => handleRemoveRelay(relay)} title="削除">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              {/each}
              {#if currentRelays.length === 0}
                <div class="card-row empty-row">
                  <span class="row-label">リレーが設定されていません</span>
                </div>
              {/if}
            </div>

            <div class="card" style="margin-top: 12px;">
              <div class="card-body">
                <label class="field-label" for="new-relay">リレーを追加</label>
                <div class="input-with-btn">
                  <input
                    id="new-relay"
                    type="text"
                    bind:value={newRelayUrl}
                    placeholder="wss://relay.example.com"
                    class="field-input mono"
                    autocomplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    on:keydown={(e) => e.key === 'Enter' && handleAddRelay()}
                  />
                  <button class="btn btn-primary btn-compact" on:click={handleAddRelay}>追加</button>
                </div>
              </div>
            </div>

          {:else if activeSection === 'about'}
            <div class="section-header">
              <h2>Noscord</h2>
              <p>Nostrプロトコルを使用したパブリックチャットクライアント</p>
            </div>

            <div class="card">
              <div class="card-row">
                <span class="row-label">バージョン</span>
                <span class="row-value">1.0.0</span>
              </div>
              <div class="card-row">
                <span class="row-label">プロトコル</span>
                <span class="row-value">Nostr (NIP-28)</span>
              </div>
              <div class="card-row">
                <span class="row-label">ライセンス</span>
                <span class="row-value">MIT License</span>
              </div>
            </div>

            <div class="card" style="margin-top: 12px;">
              <div class="card-row">
                <span class="row-label">リアルタイムチャット</span>
                <span class="row-value row-check"><Icon name="check" size={14} /></span>
              </div>
              <div class="card-row">
                <span class="row-label">チャンネル作成・参加</span>
                <span class="row-value row-check"><Icon name="check" size={14} /></span>
              </div>
              <div class="card-row">
                <span class="row-label">NIP-07 / 秘密鍵認証</span>
                <span class="row-value row-check"><Icon name="check" size={14} /></span>
              </div>
              <div class="card-row">
                <span class="row-label">カスタム絵文字・リアクション</span>
                <span class="row-value row-check"><Icon name="check" size={14} /></span>
              </div>
              <div class="card-row">
                <span class="row-label">レスポンシブ・ダークモード</span>
                <span class="row-value row-check"><Icon name="check" size={14} /></span>
              </div>
            </div>

            <div class="link-row">
              <a href="https://github.com" target="_blank" rel="noopener">
                <Icon name="globe" size={14} /><span>GitHub</span>
              </a>
              <a href="https://nostr.com" target="_blank" rel="noopener">
                <Icon name="globe" size={14} /><span>Nostr公式サイト</span>
              </a>
            </div>
          {/if}
        </div>
      </main>
    </div>
  </div>
{/if}

<style>
  /* ===== 全画面コンテナ ===== */
  .settings-screen {
    position: fixed;
    inset: 0;
    z-index: var(--z-settings-modal, 901);
    background: var(--bg-secondary, #f5f5f5);
    display: flex;
    flex-direction: column;
  }

  /* ===== ヘッダー ===== */
  .settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    height: 52px;
    flex-shrink: 0;
    background: var(--bg-primary, #fff);
    border-bottom: 1px solid var(--border-color, #e5e5e5);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: none;
    color: var(--primary-color, #059669);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 8px 6px 2px;
    border-radius: 6px;
    transition: background 0.12s;
  }

  .back-btn:hover {
    background: var(--hover-bg, rgba(0,0,0,0.04));
  }

  .header-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--primary-text, #1a1d21);
    margin: 0;
  }

  .header-spacer {
    flex: 1;
  }

  /* ===== ボディ (2カラム) ===== */
  .settings-body {
    flex: 1;
    display: flex;
    min-height: 0;
    max-width: 960px;
    width: 100%;
    margin: 0 auto;
  }

  /* ===== 左ナビ ===== */
  .settings-nav {
    width: 280px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 16px 12px;
  }

  .nav-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: var(--primary-text, #1a1d21);
    cursor: pointer;
    border-radius: 10px;
    transition: background 0.12s;
    text-align: left;
  }

  .nav-item:hover {
    background: var(--hover-bg, rgba(0,0,0,0.04));
  }

  .nav-item.active {
    background: var(--primary-color, #059669);
    color: white;
  }

  .nav-icon-wrap {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--hover-bg, rgba(0,0,0,0.06));
    color: var(--secondary-text, #666);
    flex-shrink: 0;
  }

  .nav-icon-wrap.active {
    background: rgba(255,255,255,0.2);
    color: white;
  }

  .nav-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .nav-label {
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .nav-desc {
    font-size: 0.75rem;
    opacity: 0.6;
    line-height: 1.3;
  }

  :global(.nav-chevron) {
    opacity: 0.3;
    flex-shrink: 0;
  }

  .nav-item.active :global(.nav-chevron) {
    opacity: 0.6;
  }

  /* ===== 右メイン ===== */
  .settings-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .mobile-tabs {
    display: none;
  }

  .main-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px 40px;
  }

  /* ===== セクションヘッダー ===== */
  .section-header {
    margin-bottom: 16px;
  }

  .section-header h2 {
    margin: 0 0 4px;
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--primary-text, #1a1d21);
  }

  .section-header p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--secondary-text, #888);
    line-height: 1.4;
  }

  /* ===== カード (iOS Settings風グループ) ===== */
  .card {
    background: var(--bg-primary, #fff);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--border-color, rgba(0,0,0,0.06));
  }

  .card-body {
    padding: 16px;
  }

  .card-footer {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color, #eee);
    flex-wrap: wrap;
  }

  .card-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    min-height: 44px;
    gap: 12px;
  }

  .card-row + .card-row {
    border-top: 1px solid var(--border-color, rgba(0,0,0,0.06));
  }

  .row-label {
    font-size: 0.875rem;
    color: var(--primary-text, #1a1d21);
    flex-shrink: 0;
  }

  .row-value {
    font-size: 0.875rem;
    color: var(--secondary-text, #888);
    text-align: right;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .row-value.mono {
    font-family: monospace;
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-check {
    color: var(--primary-color, #059669);
  }

  .row-action {
    border: none;
    background: none;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--secondary-text, #ccc);
    display: flex;
    transition: all 0.12s;
    flex-shrink: 0;
  }

  .row-action:hover {
    color: #dc2626;
    background: rgba(220,38,38,0.08);
  }

  .relay-row {
    gap: 8px;
  }

  .relay-url-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
    font-size: 0.813rem;
    color: var(--primary-text, #1a1d21);
  }

  .empty-row .row-label {
    color: var(--secondary-text, #aaa);
    font-style: italic;
  }

  /* ===== ステータスドット ===== */
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-ok { background: #22c55e; }
  .status-ng { background: #ef4444; }
  .status-idle { background: #d1d5db; }

  /* ===== フォーム ===== */
  .field-label {
    display: block;
    font-size: 0.813rem;
    font-weight: 600;
    color: var(--primary-text, #1a1d21);
    margin-bottom: 6px;
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .field-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    background: var(--bg-secondary, #f9f9f9);
    color: var(--primary-text, #1a1d21);
    font-size: 0.875rem;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--primary-color, #059669);
    background: var(--bg-primary, #fff);
  }

  .field-input.mono {
    font-family: monospace;
    font-size: 0.813rem;
  }

  .field-input.masked {
    -webkit-text-security: disc;
  }

  .input-wrap .field-input {
    padding-right: 40px;
  }

  .input-action {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: var(--secondary-text, #888);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
  }

  .input-action:hover {
    color: var(--primary-text, #1a1d21);
  }

  .field-hint {
    font-size: 0.75rem;
    color: var(--secondary-text, #aaa);
    margin: 6px 0 0;
  }

  .input-with-btn {
    display: flex;
    gap: 8px;
  }

  .input-with-btn .field-input {
    flex: 1;
  }

  /* ===== ボタン ===== */
  .btn-area {
    margin-top: 16px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 0.813rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
  }

  .btn-compact {
    padding: 8px 14px;
  }

  .btn-primary {
    background: var(--primary-color, #059669);
    color: white;
  }

  .btn-primary:hover {
    filter: brightness(0.9);
  }

  .btn-ghost {
    background: transparent;
    color: var(--primary-text, #1a1d21);
    border: 1px solid var(--border-color, #ddd);
  }

  .btn-ghost:hover {
    background: var(--hover-bg, rgba(0,0,0,0.04));
  }

  .btn-danger-ghost {
    background: transparent;
    color: #dc2626;
    border: 1px solid rgba(220,38,38,0.2);
  }

  .btn-danger-ghost:hover {
    background: rgba(220,38,38,0.06);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ===== 通知 ===== */
  .notice {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 0.813rem;
    line-height: 1.5;
    margin-top: 16px;
    align-items: flex-start;
  }

  .notice strong {
    display: block;
    margin-bottom: 2px;
  }

  .notice p {
    margin: 0;
  }

  .notice-warn {
    background: var(--warning-bg, #fffbeb);
    color: var(--warning-text, #92400e);
  }

  .notice-info {
    background: var(--info-bg, #eff6ff);
    color: var(--info-text, #1e40af);
  }

  /* ===== リンク ===== */
  .link-row {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }

  .link-row a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--primary-color, #059669);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    transition: background 0.12s;
  }

  .link-row a:hover {
    background: rgba(5,150,105,0.08);
  }

  /* ===== モバイル ===== */
  @media (max-width: 767px) {
    .settings-body {
      flex-direction: column;
    }

    .settings-nav {
      display: none;
    }

    .mobile-tabs {
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-bottom: 1px solid var(--border-color, #e5e5e5);
      background: var(--bg-primary, #fff);
      flex-shrink: 0;
      gap: 0;
    }

    .mobile-tab {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 10px 14px;
      border: none;
      background: transparent;
      color: var(--secondary-text, #888);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.12s;
    }

    .mobile-tab.active {
      color: var(--primary-color, #059669);
      border-bottom-color: var(--primary-color, #059669);
    }

    .main-scroll {
      padding: 16px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }

    .settings-header {
      padding: 0 12px;
    }

    .header-title {
      flex: 1;
      text-align: center;
    }

    .back-btn span {
      display: none;
    }
  }

  /* ===== 大画面 ===== */
  @media (min-width: 768px) {
    .header-spacer {
      display: none;
    }
  }
</style>
