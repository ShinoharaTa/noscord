<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { newThread, newThreadWithNip07, post, postWithNip07 } from "$lib/nostr";
  import { getSecKey, settingsModal, getUseNip07, nip07Available } from "$lib/store";
  import Icon from "$lib/components/icons.svelte";
  import "websocket-polyfill";
  const channel_id: string = $page.params.channel_id;

  let name = "";
  let postContent = "";
  let isSubmitting = false;
  let isLoggedIn = false;
  let isChecking = true;
  
  $: submitDisabled = !name.trim() || !postContent.trim() || isSubmitting;

  // ログイン状態をチェック
  onMount(() => {
    const seckey = getSecKey();
    const useNip07 = getUseNip07();
    isLoggedIn = !!seckey || (useNip07 && $nip07Available);
    isChecking = false;
  });

  const submit = async () => {
    if (isSubmitting) return;
    
    // 空白や空文字の投稿を阻止
    if (!name.trim() || !postContent.trim()) {
      return;
    }
    
    isSubmitting = true;
    const useNip07 = getUseNip07();
    const seckey = getSecKey();
    
    // NIP-07を使用する場合とnsec1を使用する場合の分岐
    if (useNip07) {
      if (!$nip07Available) {
        alert("ブラウザ拡張機能が利用できません。設定でnsec1方式に切り替えるか、拡張機能をインストールしてください。");
        isSubmitting = false;
        return;
      }
    } else {
      if (!seckey) {
        alert("投稿するには鍵の生成または登録が必要です");
        isSubmitting = false;
        return;
      }
    }
    
    try {
      let threadId: string;
      if (useNip07) {
        threadId = await newThreadWithNip07(name, "");
      } else {
        threadId = await newThread(name, "", seckey!);
      }
      
      if (!threadId) {
        isSubmitting = false;
        return;
      }
      
      let result: boolean;
      if (useNip07) {
        result = await postWithNip07(postContent, threadId, null, []);
      } else {
        result = await post(postContent, threadId, seckey!, null, []);
      }
      
      if (result) {
        alert("新しいチャンネルを作成しました！");
        goto(`/${threadId}`);
      }
    } catch (error) {
      alert("チャンネルの作成に失敗しました");
    } finally {
      isSubmitting = false;
    }
  };

  const cancel = () => {
    goto('/');
  };
</script>

<div class="new-channel-container">
  <div class="new-channel-header">
    <h1>新しいチャンネルを作成</h1>
    <p class="subtitle">新しいトピックを始めましょう</p>
  </div>

  {#if isChecking}
    <div class="checking-container">
      <div class="loading-spinner"></div>
      <p>認証状態を確認中...</p>
    </div>
  {:else if !isLoggedIn}
    <div class="login-required">
              <div class="login-icon">
          <Icon name="key" size={24} />
        </div>
      <h2>ログインが必要です</h2>
      <p>チャンネルを作成するには、秘密鍵の登録が必要です。</p>
      <div class="login-actions">
        <button class="btn btn-primary" on:click={() => settingsModal.set(true)}>
          キー管理を開く
        </button>
        <button class="btn btn-secondary" on:click={cancel}>
          ホームに戻る
        </button>
      </div>
      <div class="login-help">
        <p>
          <strong>初回利用の場合:</strong><br>
          キー管理で新しい秘密鍵を生成するか、既存の秘密鍵を登録してください。
        </p>
      </div>
    </div>
  {:else}
    <div class="new-channel-form">
      <div class="form-group">
        <label class="form-label" for="channel-name">
          チャンネル名 <span class="required">*</span>
        </label>
        <input 
          id="channel-name"
          type="text" 
          bind:value={name} 
          placeholder="例: 雑談、技術議論、ニュース"
          class="form-input"
          maxlength="100"
          disabled={isSubmitting}
        />
        <small class="form-help">チャンネルの目的が分かりやすい名前をつけましょう</small>
      </div>

      <div class="form-group">
        <label class="form-label" for="first-message">
          最初のメッセージ <span class="required">*</span>
        </label>
        <textarea 
          id="first-message"
          bind:value={postContent} 
          placeholder="このチャンネルの目的や、最初のトピックを書いてください..."
          class="form-textarea"
          rows="4"
          maxlength="1000"
          disabled={isSubmitting}
        ></textarea>
        <small class="form-help">他の人が参加しやすくなるような説明を書いてください</small>
      </div>

      <div class="form-actions">
        <button 
          class="btn btn-secondary" 
          on:click={cancel}
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button 
          class="btn btn-primary" 
          on:click={submit} 
          disabled={submitDisabled}
        >
          {#if isSubmitting}
            <span class="spinner"></span>
            作成中...
          {:else}
            チャンネルを作成
          {/if}
        </button>
      </div>

      <div class="form-notice">
        <p>
          <strong>注意:</strong> 新しいチャンネルが一覧に反映されるまで、最大5分程度かかる場合があります。
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .new-channel-container {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--space-10) var(--space-6);
    background: var(--chat-bg);
    min-height: 100vh;
    min-height: 100dvh;
  }

  .new-channel-header {
    text-align: center;
    margin-bottom: var(--space-10);
  }

  .new-channel-header h1 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin: 0 0 var(--space-2) 0;
    color: var(--primary-text);
  }

  .subtitle {
    color: var(--secondary-text);
    margin: 0;
    font-size: var(--font-size-lg);
  }

  .new-channel-form {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    box-shadow: var(--shadow-md);
  }

  .form-group {
    margin-bottom: var(--space-6);
  }

  .form-label {
    display: block;
    font-weight: var(--font-weight-semibold);
    color: var(--primary-text);
    margin-bottom: var(--space-2);
    font-size: var(--font-size-base);
  }

  .required {
    color: var(--error-color);
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--input-bg);
    color: var(--text-color);
    font-size: var(--font-size-base);
    line-height: 1.4;
    transition: border-color 0.2s, box-shadow 0.2s;
    font-family: inherit;
  }

  .form-input:focus, .form-textarea:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-alpha);
  }

  .form-input:disabled, .form-textarea:disabled {
    background: var(--disabled-bg);
    cursor: not-allowed;
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-help {
    display: block;
    margin-top: var(--space-1);
    font-size: var(--font-size-sm);
    color: var(--secondary-text);
    line-height: 1.3;
  }

  .checking-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px var(--space-5);
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-4);
  }

  .login-required {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-10) var(--space-8);
    text-align: center;
    box-shadow: var(--shadow-md);
  }

  .login-icon {
    font-size: 4rem;
    margin-bottom: var(--space-4);
    color: var(--primary-color);
  }

  .login-required h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4) 0;
    color: var(--primary-text);
  }

  .login-required p {
    font-size: var(--font-size-lg);
    color: var(--secondary-text);
    margin: 0 0 var(--space-6) 0;
    line-height: var(--line-height-normal);
  }

  .login-actions {
    display: flex;
    gap: var(--space-4);
    justify-content: center;
    margin-bottom: var(--space-8);
  }

  .login-actions .btn {
    min-width: 140px;
  }

  .login-help {
    padding: var(--space-5);
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: var(--radius-md);
    text-align: left;
  }

  .login-help p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--info-text);
    line-height: var(--line-height-normal);
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-8);
  }

  .btn {
    padding: var(--space-3) var(--space-6);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: inherit;
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
    box-shadow: var(--shadow-sm);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .btn:disabled {
    background: var(--disabled-bg);
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .form-notice {
    margin-top: var(--space-6);
    padding: var(--space-4);
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: var(--radius-md);
  }

  .form-notice p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--info-text);
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .new-channel-container {
      padding: var(--space-6) var(--space-4);
    }

    .new-channel-header h1 {
      font-size: var(--font-size-2xl);
    }

    .new-channel-form, .login-required {
      padding: var(--space-6);
    }

    .form-actions, .login-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }

    .login-icon {
      font-size: 3rem;
    }

    .login-required h2 {
      font-size: var(--font-size-xl);
    }
  }
</style>
