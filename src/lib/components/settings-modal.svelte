<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsModal, getSecKey, saveToIdentifiedKey, removeIdentifiedKey } from '$lib/store';
  import { generateSecretKey } from 'nostr-tools';
  import { bytesToHex } from '@noble/hashes/utils';
  import { nsecEncode, decode } from 'nostr-tools/nip19';
  import Icon from './icons.svelte';

  let secretKey = '';
  let showSecretKey = false;

  onMount(() => {
    // 既存の秘密鍵を読み込み（Hex形式をnsec1形式に変換）
    const existingKey = getSecKey();
    if (existingKey) {
      try {
        // Hex形式からnsec1形式に変換
        secretKey = nsecEncode(existingKey);
      } catch (error) {
        // 変換に失敗した場合はそのまま表示
        secretKey = existingKey;
      }
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
        const decoded = decode(secretKey);
        hexKey = bytesToHex(decoded.data);
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
    secretKey = nsecEncode(hexKey);
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
</script>

<!-- 設定モーダル -->
{#if $settingsModal}
  <div class="settings-overlay" on:click={() => settingsModal.set(false)}></div>
  <div class="settings-modal">
    <div class="settings-modal-header">
      <h2>設定</h2>
      <button class="close-button" on:click={() => settingsModal.set(false)}>
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
    background: rgba(0, 0, 0, 0.5);
    z-index: 1500;
  }

  .settings-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--modal-bg, #ffffff);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 1501;
    max-height: 80vh;
    max-width: 500px;
    width: calc(100vw - 32px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .settings-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
    flex-shrink: 0;
  }

  .settings-modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .close-button {
    background: none;
    border: none;
    color: var(--secondary-text, #6c757d);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: var(--hover-bg, #f8f9fa);
  }

  .settings-modal-content {
    padding: 0;
    overflow-y: auto;
    flex: 1;
    max-height: 60vh;
  }

  .settings-content {
    padding: 24px;
  }

  .settings-section {
    margin-bottom: 32px;
    padding-bottom: 32px;
    border-bottom: 1px solid var(--border-color, #e3e5e8);
  }

  .settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .settings-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .settings-section-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .section-description {
    margin: 0 0 24px 0;
    color: var(--secondary-text, #6c757d);
    line-height: 1.5;
  }

  .settings-form {
    margin-bottom: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-color, #1a1d21);
    font-size: 0.9rem;
  }

  .form-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 8px;
    background: var(--input-bg, #ffffff);
    color: var(--text-color, #1a1d21);
    font-size: 0.9rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    transition: border-color 0.2s;
    height: 44px;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-color, #059669);
  }

  .form-help {
    margin: 8px 0 0 0;
    font-size: 0.8rem;
    color: var(--secondary-text, #6c757d);
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
    right: 12px;
    background: none;
    border: none;
    color: var(--secondary-text, #6c757d);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .password-toggle:hover {
    background: var(--hover-bg, #f8f9fa);
    color: var(--text-color, #1a1d21);
  }

  .password-toggle:focus {
    outline: 2px solid var(--primary-color, #059669);
    outline-offset: 2px;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn-primary, .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--primary-color, #059669);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-color-hover, #047857);
  }

  .btn-secondary {
    background: var(--secondary-bg, #f8f9fa);
    color: var(--text-color, #1a1d21);
    border: 1px solid var(--border-color, #e3e5e8);
  }

  .btn-secondary:hover {
    background: var(--hover-bg, #e9ecef);
  }

  .btn-danger {
    background: var(--danger-color, #dc3545);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .btn-danger:hover {
    background: var(--danger-color-hover, #c82333);
  }

  .warning-box {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: var(--warning-bg, #fff3cd);
    border: 1px solid var(--warning-border, #ffeaa7);
    border-radius: 8px;
    color: var(--warning-text, #856404);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .about-section {
    margin-bottom: 32px;
  }

  .about-section:last-child {
    margin-bottom: 0;
  }

  .about-section h4 {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--info-bg, #f8f9fa);
    border-radius: 6px;
  }

  .info-label {
    font-weight: 500;
    color: var(--secondary-text, #6c757d);
  }

  .info-value {
    font-weight: 600;
    color: var(--text-color, #1a1d21);
  }

  .feature-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-color, #1a1d21);
  }

  .feature-list li {
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .link-group {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .external-link {
    color: var(--primary-color, #059669);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .external-link:hover {
    color: var(--primary-color-hover, #047857);
    text-decoration: underline;
  }

  /* ダークテーマ対応 */
  @media (prefers-color-scheme: dark) {
    .settings-modal {
      --modal-bg: #2f3136;
      --text-color: #ffffff;
      --secondary-text: #b9bbbe;
      --border-color: #40444b;
      --input-bg: #40444b;
      --primary-color: #059669;
      --primary-color-hover: #047857;
      --secondary-bg: #40444b;
      --hover-bg: #36393f;
      --warning-bg: #fef3c7;
      --warning-border: #f59e0b;
      --warning-text: #92400e;
      --info-bg: #40444b;
      --danger-color: #f04747;
      --danger-color-hover: #d73502;
    }
  }
</style> 