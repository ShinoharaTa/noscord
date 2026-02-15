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
  import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
  import { nip19 } from 'nostr-tools';
  import Icon from './icons.svelte';

  let secretKey = '';
  let showSecretKey = false;
  let nip07PublicKey = '';
  let loadingNip07 = false;

  onMount(() => {
    const initialize = async () => {
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
    };
    void initialize();

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
    <div class="flex justify-between items-center py-5 px-6 border-b border-border shrink-0">
      <h2 class="m-0 text-xl font-semibold text-foreground">設定</h2>
      <button class="bg-transparent border-none text-foreground-secondary cursor-pointer p-1 rounded-sm transition-colors flex items-center justify-center hover:bg-surface-hover" on:click={closeModal}>
        <Icon name="x" size={20} />
      </button>
    </div>
    <div class="p-0 overflow-y-auto flex-1 max-h-[60vh]">
      <div class="p-6">
        <!-- キー管理セクション -->
        <div class="settings-section mb-8 pb-8 border-b border-border">
          <div class="flex items-center gap-3 mb-3">
            <Icon name="key" size={20} />
            <h3 class="m-0 text-xl font-semibold text-foreground">秘密鍵の管理</h3>
          </div>
          <p class="mb-6 text-foreground-secondary leading-normal">Nostrプロトコルで使用する秘密鍵の設定と管理を行います。</p>
          
          <div class="mb-6">
            <div class="mb-5">
              <label for="secret-key" class="block mb-2 font-medium text-foreground text-sm">秘密鍵 (nsec1形式)</label>
              <div class="relative flex items-center">
                {#if showSecretKey}
                  <input
                    id="secret-key"
                    type="text"
                    bind:value={secretKey}
                    placeholder="nsec1... または64文字のHex形式"
                    class="form-input w-full py-3 px-4 pr-12 border border-border rounded-md bg-surface-input text-foreground text-sm font-mono transition-colors h-11 max-w-full"
                  />
                {:else}
                  <input
                    id="secret-key"
                    type="password"
                    bind:value={secretKey}
                    placeholder="nsec1... または64文字のHex形式"
                    class="form-input w-full py-3 px-4 pr-12 border border-border rounded-md bg-surface-input text-foreground text-sm font-mono transition-colors h-11 max-w-full"
                  />
                {/if}
                <button
                  type="button"
                  class="password-toggle absolute right-3 bg-transparent border-none text-foreground-secondary cursor-pointer p-1 rounded-sm transition-all flex items-center justify-center hover:bg-surface-hover hover:text-foreground"
                  on:click={toggleSecretKeyVisibility}
                  title={showSecretKey ? '秘密鍵を非表示' : '秘密鍵を表示'}
                >
                  <Icon name={showSecretKey ? 'eye-off' : 'eye'} size={16} />
                </button>
              </div>
              <p class="mt-2 text-xs text-foreground-secondary">nsec1形式（推奨）または64文字のHex形式で入力してください。</p>
            </div>
            
            <div class="flex gap-3 flex-wrap">
              <button class="flex items-center gap-2 py-2.5 px-4 border-none rounded-md text-sm cursor-pointer transition-all font-medium bg-accent text-white hover:bg-accent-hover" on:click={saveSecretKey}>
                <Icon name="key" size={16} />
                <span>秘密鍵を保存</span>
              </button>
              <button class="flex items-center gap-2 py-2.5 px-4 rounded-md text-sm cursor-pointer transition-all font-medium bg-surface-alt text-foreground border border-border hover:bg-surface-hover" on:click={generateNewKey}>
                <Icon name="refresh" size={16} />
                <span>新しい鍵を生成</span>
              </button>
              {#if secretKey}
                <button class="flex items-center gap-2 py-2.5 px-4 border-none rounded-md text-sm cursor-pointer transition-all font-medium bg-danger text-white hover:bg-danger-hover" on:click={deleteSecretKey}>
                  <Icon name="trash" size={16} />
                  <span>秘密鍵を削除</span>
                </button>
              {/if}
            </div>
          </div>
          
          <div class="flex gap-3 p-4 bg-warning-bg border border-warning-border rounded-md text-warning-text text-sm leading-snug">
            <Icon name="info" size={16} />
            <div>
              <strong>重要:</strong> 秘密鍵は安全に保管してください。この鍵を紛失すると、アカウントにアクセスできなくなります。
            </div>
          </div>
        </div>

        <!-- NIP-07 ブラウザ拡張機能セクション -->
        <div class="settings-section mb-8 pb-8 border-b border-border">
          <div class="flex items-center gap-3 mb-3">
            <Icon name="globe" size={20} />
            <h3 class="m-0 text-xl font-semibold text-foreground">ブラウザ拡張機能 (NIP-07)</h3>
          </div>
          <p class="mb-6 text-foreground-secondary leading-normal">nos2x等のブラウザ拡張機能を使用して安全に署名を行うことができます。</p>
          
          <div class="mb-4">
            {#if $nip07Available}
              <div class="flex items-center gap-2 py-2 px-3 rounded-md text-sm mb-2 bg-success-bg text-success-text border border-success-border">
                <Icon name="check-circle" size={16} />
                <span>ブラウザ拡張機能が利用可能です</span>
              </div>
            {:else}
              <div class="flex items-center gap-2 py-2 px-3 rounded-md text-sm mb-2 bg-warning-bg text-warning-text border border-warning-border">
                <Icon name="x-circle" size={16} />
                <span>ブラウザ拡張機能が見つかりません</span>
              </div>
            {/if}
            
            {#if $useNip07}
              <div class="flex items-center gap-2 py-2 px-3 rounded-md text-sm mb-2 bg-info-bg text-info-text border border-info-border">
                <Icon name="link" size={16} />
                <span>ブラウザ拡張機能を使用中</span>
              </div>
            {/if}
          </div>

          {#if $nip07Available}
            <div class="mt-4">
              {#if $useNip07}
                <div class="mb-5">
                  <label for="nip07-public-key" class="block mb-2 font-medium text-foreground text-sm">公開鍵</label>
                  <div>
                    <input
                      id="nip07-public-key"
                      type="text"
                      value={nip07PublicKey || $nip07PubKey || '読み込み中...'}
                      readonly
                      class="form-input w-full py-3 px-4 border border-border rounded-md bg-surface-input text-foreground text-sm font-mono transition-colors h-11 max-w-full"
                    />
                  </div>
                </div>
                
                <div class="flex gap-3 flex-wrap">
                  <button class="flex items-center gap-2 py-2.5 px-4 rounded-md text-sm cursor-pointer transition-all font-medium bg-surface-alt text-foreground border border-border hover:bg-surface-hover" on:click={disconnectNip07}>
                    <Icon name="unlink" size={16} />
                    <span>拡張機能との接続を解除</span>
                  </button>
                </div>
              {:else}
                <div class="flex gap-3 flex-wrap">
                  <button 
                    class="flex items-center gap-2 py-2.5 px-4 border-none rounded-md text-sm cursor-pointer transition-all font-medium bg-accent text-white hover:bg-accent-hover" 
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
            <div class="flex gap-3 p-3 bg-info-bg border border-info-border rounded-md text-sm leading-snug text-info-text">
              <Icon name="info" size={16} />
              <div>
                <strong>推奨:</strong> nos2x等のNIP-07対応ブラウザ拡張機能をインストールすると、より安全に署名を行うことができます。
              </div>
            </div>
          {/if}
        </div>

        <!-- アプリについてセクション -->
        <div class="settings-section">
          <div class="flex items-center gap-3 mb-3">
            <Icon name="info" size={20} />
            <h3 class="m-0 text-xl font-semibold text-foreground">Noscord について</h3>
          </div>
          <p class="mb-6 text-foreground-secondary leading-normal">Nostrプロトコルを使用したパブリックチャットクライアントです。</p>
          
          <div class="mb-8">
            <h4 class="mb-4 text-lg font-semibold text-foreground">アプリケーション情報</h4>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="flex justify-between py-3 px-4 bg-surface-alt rounded-md">
                <span class="font-medium text-foreground-secondary">バージョン</span>
                <span class="font-semibold text-foreground">1.0.0</span>
              </div>
              <div class="flex justify-between py-3 px-4 bg-surface-alt rounded-md">
                <span class="font-medium text-foreground-secondary">プロトコル</span>
                <span class="font-semibold text-foreground">Nostr</span>
              </div>
              <div class="flex justify-between py-3 px-4 bg-surface-alt rounded-md">
                <span class="font-medium text-foreground-secondary">ライセンス</span>
                <span class="font-semibold text-foreground">MIT License</span>
              </div>
            </div>
          </div>
          
          <div class="mb-8">
            <h4 class="mb-4 text-lg font-semibold text-foreground">機能</h4>
            <ul class="m-0 pl-5 text-foreground">
              <li class="mb-2 leading-snug">リアルタイムチャット</li>
              <li class="mb-2 leading-snug">チャンネル作成・参加</li>
              <li class="mb-2 leading-snug">秘密鍵による認証</li>
              <li class="mb-2 leading-snug">レスポンシブデザイン</li>
              <li class="mb-2 leading-snug">ダークモード対応</li>
            </ul>
          </div>
          
          <div>
            <h4 class="mb-4 text-lg font-semibold text-foreground">開発者情報</h4>
            <p>このアプリケーションはオープンソースプロジェクトです。</p>
            <div class="flex gap-4 flex-wrap">
              <a href="https://github.com" class="text-accent no-underline font-medium transition-colors hover:text-accent-hover hover:underline" target="_blank" rel="noopener">
                GitHub
              </a>
              <a href="https://nostr.com" class="text-accent no-underline font-medium transition-colors hover:text-accent-hover hover:underline" target="_blank" rel="noopener">
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
  /* モーダル配置（Tailwind では表現が複雑） */
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

  /* last-child でボーダーを消す */
  .settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  /* フォーカス状態 */
  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .password-toggle:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
</style> 