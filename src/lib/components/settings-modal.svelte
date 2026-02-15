<script lang="ts">
  import { onMount } from 'svelte';
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
  import { generateSecretKey } from 'nostr-tools';
  import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
  import { nip19 } from 'nostr-tools';
  import Icon from './icons.svelte';

  let secretKey = '';
  let showSecretKey = false;
  let nip07PublicKey = '';
  let loadingNip07 = false;

  onMount(async () => {
    // 既存の秘密鍵を読み込み（Hex形式をnsec1形式に変換）
    const existingKey = getSecKey();
    if (existingKey) {
      try {
        // Hex形式からnsec1形式に変換
        secretKey = nip19.nsecEncode(hexToBytes(existingKey));
      } catch (error) {
        // 変換に失敗した場合はそのまま表示
        secretKey = existingKey;
      }
    }

    // NIP-07の可用性をチェック
    checkNip07Availability();
    
    // 既存のNIP-07公開鍵を取得
    if ($nip07Available && $useNip07) {
      await loadNip07PublicKey();
    }

    // Escキーでモーダルを閉じる
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && $settingsModal) {
        settingsModal.set(false);
      }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      // コンポーネント破棄時にスクロールを復元
      document.body.style.overflow = '';
    };
  });

  // モーダルが開いた時にスクロールを禁止
  $: if (typeof document !== 'undefined') {
    if ($settingsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  const saveSecretKey = () => {
    try {
      let hexKey = '';
      
      if (secretKey.startsWith('nsec1')) {
        // nsec1形式の場合はHex形式に変換
        const decoded = nip19.decode(secretKey);
        hexKey = bytesToHex(decoded.data as Uint8Array);
      } else if (secretKey.length === 64) {
        // 既にHex形式の場合はそのまま使用
        hexKey = secretKey;
      } else {
        alert('秘密鍵はnsec1形式または64文字のHex形式で入力してください');
        return;
      }

      saveToIdentifiedKey(hexKey);
      alert('秘密鍵を保存しました');
    } catch (error) {
      alert('秘密鍵の形式が正しくありません。nsec1形式または64文字のHex形式で入力してください');
    }
  };

  const generateNewKey = () => {
    const secretKeyBytes = generateSecretKey();
    const hexKey = bytesToHex(secretKeyBytes);
    // 新しく生成した鍵をnsec1形式で表示
    secretKey = nip19.nsecEncode(hexToBytes(hexKey));
  };

  const toggleSecretKeyVisibility = () => {
    showSecretKey = !showSecretKey;
  };

  const deleteSecretKey = () => {
    const confirmed = confirm(
      '本当に秘密鍵を削除しますか？\n\nこの操作は取り消せません。秘密鍵を削除すると、このアカウントにアクセスできなくなります。\n\n削除する前に秘密鍵をバックアップしていることを確認してください。'
    );
    
    if (confirmed) {
      removeIdentifiedKey();
      secretKey = '';
      alert('秘密鍵を削除しました。');
    }
  };

  // NIP-07関連の関数
  const loadNip07PublicKey = async () => {
    if (!$nip07Available) return;
    
    loadingNip07 = true;
    try {
      const pubkey = await getNip07PublicKey();
      if (pubkey) {
        nip07PublicKey = pubkey;
      }
    } catch (error) {
      console.error('Failed to load NIP-07 public key:', error);
      alert('ブラウザ拡張機能から公開鍵を取得できませんでした。');
    } finally {
      loadingNip07 = false;
    }
  };

  const connectNip07 = async () => {
    if (!$nip07Available) {
      alert('NIP-07対応のブラウザ拡張機能（nos2x等）がインストールされていません。');
      return;
    }

    await loadNip07PublicKey();
    if (nip07PublicKey) {
      setUseNip07(true);
      alert('ブラウザ拡張機能との接続が完了しました。');
    }
  };

  const disconnectNip07 = () => {
    setUseNip07(false);
    nip07PublicKey = '';
    alert('ブラウザ拡張機能との接続を解除しました。');
  };

  const closeModal = () => settingsModal.set(false);

  const handleOverlayKeydown = (event: KeyboardEvent) => {
    // Enter / Space で閉じる（A11y）
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeModal();
    }
  };
</script>

<!-- 設定モーダル -->
{#if $settingsModal}
  <div
    class="settings-overlay"
    role="button"
    aria-label="設定モーダルを閉じる"
    tabindex="0"
    on:click={closeModal}
    on:keydown={handleOverlayKeydown}
  ></div>
  <div class="settings-modal">
    <div class="settings-modal-header">
      <h2>設定</h2>
      <button class="close-button" on:click={closeModal}>
        <Icon name="x" size={20} />
      </button>
    </div>
    <div class="settings-modal-content">
      <div class="settings-content">
        <!-- キー管理セクション -->
        <div class="settings-section">
          <div class="settings-section-header">
            <Icon name="key" size={20} />
            <h3>秘密鍵の管理</h3>
          </div>
          <p class="section-description">Nostrプロトコルで使用する秘密鍵の設定と管理を行います。</p>
          
          <div class="settings-form">
            <div class="form-group">
              <label for="secret-key">秘密鍵 (nsec1形式)</label>
              <div class="password-input-container">
                {#if showSecretKey}
                  <input
                    id="secret-key"
                    type="text"
                    bind:value={secretKey}
                    placeholder="nsec1... または64文字のHex形式"
                    class="form-input password-input"
                  />
                {:else}
                  <input
                    id="secret-key"
                    type="password"
                    bind:value={secretKey}
                    placeholder="nsec1... または64文字のHex形式"
                    class="form-input password-input"
                  />
                {/if}
                <button
                  type="button"
                  class="password-toggle"
                  on:click={toggleSecretKeyVisibility}
                  title={showSecretKey ? '秘密鍵を非表示' : '秘密鍵を表示'}
                >
                  <Icon name={showSecretKey ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
              <p class="form-help">nsec1形式（推奨）または64文字のHex形式で入力してください。</p>
            </div>
            
            <div class="form-actions">
              <button class="btn-primary" on:click={saveSecretKey}>
                <Icon name="key" size={16} />
                <span>秘密鍵を保存</span>
              </button>
              <button class="btn-secondary" on:click={generateNewKey}>
                <Icon name="refresh" size={16} />
                <span>新しい鍵を生成</span>
              </button>
              {#if secretKey}
                <button class="btn-danger" on:click={deleteSecretKey}>
                  <Icon name="trash" size={16} />
                  <span>秘密鍵を削除</span>
                </button>
              {/if}
            </div>
          </div>
          
          <div class="warning-box">
            <Icon name="info" size={16} />
            <div>
              <strong>重要:</strong> 秘密鍵は安全に保管してください。この鍵を紛失すると、アカウントにアクセスできなくなります。
            </div>
          </div>
        </div>

        <!-- NIP-07 ブラウザ拡張機能セクション -->
        <div class="settings-section">
          <div class="settings-section-header">
            <Icon name="globe" size={20} />
            <h3>ブラウザ拡張機能 (NIP-07)</h3>
          </div>
          <p class="section-description">nos2x等のブラウザ拡張機能を使用して安全に署名を行うことができます。</p>
          
          <div class="nip07-status">
            {#if $nip07Available}
              <div class="status-item status-available">
                <Icon name="check-circle" size={16} />
                <span>ブラウザ拡張機能が利用可能です</span>
              </div>
            {:else}
              <div class="status-item status-unavailable">
                <Icon name="x-circle" size={16} />
                <span>ブラウザ拡張機能が見つかりません</span>
              </div>
            {/if}
            
            {#if $useNip07}
              <div class="status-item status-connected">
                <Icon name="link" size={16} />
                <span>ブラウザ拡張機能を使用中</span>
              </div>
            {/if}
          </div>

          {#if $nip07Available}
            <div class="nip07-section">
              {#if $useNip07}
                <div class="form-group">
                  <label for="nip07-public-key">公開鍵</label>
                  <div class="public-key-display">
                    <input
                      id="nip07-public-key"
                      type="text"
                      value={nip07PublicKey || $nip07PubKey || '読み込み中...'}
                      readonly
                      class="form-input"
                    />
                  </div>
                </div>
                
                <div class="form-actions">
                  <button class="btn-secondary" on:click={disconnectNip07}>
                    <Icon name="unlink" size={16} />
                    <span>拡張機能との接続を解除</span>
                  </button>
                </div>
              {:else}
                <div class="form-actions">
                  <button 
                    class="btn-primary" 
                    on:click={connectNip07}
                    disabled={loadingNip07}
                  >
                    {#if loadingNip07}
                      <Icon name="loader" size={16} />
                      <span>接続中...</span>
                    {:else}
                      <Icon name="link" size={16} />
                      <span>ブラウザ拡張機能と接続</span>
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <div class="info-box">
              <Icon name="info" size={16} />
              <div>
                <strong>推奨:</strong> nos2x等のNIP-07対応ブラウザ拡張機能をインストールすると、より安全に署名を行うことができます。
              </div>
            </div>
          {/if}
        </div>

        <!-- アプリについてセクション -->
        <div class="settings-section">
          <div class="settings-section-header">
            <Icon name="info" size={20} />
            <h3>Noscord について</h3>
          </div>
          <p class="section-description">Nostrプロトコルを使用したパブリックチャットクライアントです。</p>
          
          <div class="about-section">
            <h4>アプリケーション情報</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">バージョン</span>
                <span class="info-value">1.0.0</span>
              </div>
              <div class="info-item">
                <span class="info-label">プロトコル</span>
                <span class="info-value">Nostr</span>
              </div>
              <div class="info-item">
                <span class="info-label">ライセンス</span>
                <span class="info-value">MIT License</span>
              </div>
            </div>
          </div>
          
          <div class="about-section">
            <h4>機能</h4>
            <ul class="feature-list">
              <li>リアルタイムチャット</li>
              <li>チャンネル作成・参加</li>
              <li>秘密鍵による認証</li>
              <li>レスポンシブデザイン</li>
              <li>ダークモード対応</li>
            </ul>
          </div>
          
          <div class="about-section">
            <h4>開発者情報</h4>
            <p>このアプリケーションはオープンソースプロジェクトです。</p>
            <div class="link-group">
              <a href="https://github.com" class="external-link" target="_blank" rel="noopener">
                GitHub
              </a>
              <a href="https://nostr.com" class="external-link" target="_blank" rel="noopener">
                Nostr公式サイト
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--z-settings-overlay);
  }

  .settings-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--modal-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-settings-modal);
    max-height: 80vh;
    max-width: 500px;
    width: calc(100vw - 32px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: var(--border);
  }

  .settings-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .settings-modal-header h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-color);
  }

  .close-button {
    background: none;
    border: none;
    color: var(--secondary-text);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: var(--hover-bg);
  }

  .settings-modal-content {
    padding: 0;
    overflow-y: auto;
    flex: 1;
    max-height: 60vh;
  }

  .settings-content {
    padding: var(--space-6);
  }

  .settings-section {
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--border-color);
  }

  .settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .settings-section-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .settings-section-header h3 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-color);
  }

  .section-description {
    margin: 0 0 var(--space-6) 0;
    color: var(--secondary-text);
    line-height: var(--line-height-normal);
  }

  .settings-form {
    margin-bottom: var(--space-6);
  }

  .form-group {
    margin-bottom: var(--space-5);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: var(--font-weight-medium);
    color: var(--text-color);
    font-size: var(--font-size-sm);
  }

  .form-input {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--input-bg);
    color: var(--text-color);
    font-size: var(--font-size-sm);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    transition: border-color 0.2s;
    height: 44px;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .form-help {
    margin: var(--space-2) 0 0 0;
    font-size: var(--font-size-xs);
    color: var(--secondary-text);
  }

  .password-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-input {
    padding-right: 48px;
  }

  .password-toggle {
    position: absolute;
    right: var(--space-3);
    background: none;
    border: none;
    color: var(--secondary-text);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .password-toggle:hover {
    background: var(--hover-bg);
    color: var(--text-color);
  }

  .password-toggle:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .btn-primary, .btn-secondary {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 10px var(--space-4);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: var(--font-weight-medium);
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-color-hover);
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--hover-bg);
  }

  .btn-danger {
    background: var(--danger-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 10px var(--space-4);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: var(--font-weight-medium);
  }

  .btn-danger:hover {
    background: var(--danger-color-hover);
  }

  /* NIP-07 styles */
  .nip07-status {
    margin-bottom: var(--space-4);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-2);
  }

  .status-available {
    background: var(--success-bg);
    color: var(--success-text);
    border: 1px solid var(--success-border);
  }

  .status-unavailable {
    background: var(--warning-bg);
    color: var(--warning-text);
    border: 1px solid var(--warning-border);
  }

  .status-connected {
    background: var(--info-bg);
    color: var(--info-text);
    border: 1px solid var(--info-border);
  }

  .nip07-section {
    margin-top: var(--space-4);
  }

  .public-key-display input {
    font-family: monospace;
    font-size: var(--font-size-sm);
    background: var(--input-bg);
    border: 1px solid var(--border-color);
  }

  .info-box {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    line-height: 1.4;
    color: var(--info-text);
  }

  .warning-box {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-md);
    color: var(--warning-text);
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  .about-section {
    margin-bottom: var(--space-8);
  }

  .about-section:last-child {
    margin-bottom: 0;
  }

  .about-section h4 {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-color);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  .info-label {
    font-weight: var(--font-weight-medium);
    color: var(--secondary-text);
  }

  .info-value {
    font-weight: var(--font-weight-semibold);
    color: var(--text-color);
  }

  .feature-list {
    margin: 0;
    padding-left: var(--space-5);
    color: var(--text-color);
  }

  .feature-list li {
    margin-bottom: var(--space-2);
    line-height: 1.4;
  }

  .link-group {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .external-link {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: var(--font-weight-medium);
    transition: color 0.2s;
  }

  .external-link:hover {
    color: var(--primary-color-hover);
    text-decoration: underline;
  }
</style> 