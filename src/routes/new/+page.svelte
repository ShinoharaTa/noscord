<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { newThread, post } from "$lib/nostr";
  import { getSecKey, settingsModal } from "$lib/store";
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
    isLoggedIn = !!seckey;
    isChecking = false;
  });

  const submit = async () => {
    if (isSubmitting) return;
    
    isSubmitting = true;
    const seckey = getSecKey();
    if (!seckey) {
      alert("投稿するには鍵の生成または登録が必要です");
      isSubmitting = false;
      return;
    }
    
    try {
      const threadId = await newThread(name, "", seckey);
      if (!threadId) {
        isSubmitting = false;
        return;
      }
      
      const result = await post(postContent, threadId, seckey, null);
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
    padding: 40px 24px;
    background: var(--chat-bg);
    min-height: 100vh;
  }

  .new-channel-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .new-channel-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: var(--primary-text);
  }

  .subtitle {
    color: var(--secondary-text);
    margin: 0;
    font-size: 1.1rem;
  }

  .new-channel-form {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .form-group {
    margin-bottom: 24px;
  }

  .form-label {
    display: block;
    font-weight: 600;
    color: var(--primary-text);
    margin-bottom: 8px;
    font-size: 1rem;
  }

  .required {
    color: var(--error-color);
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 1rem;
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
    margin-top: 6px;
    font-size: 0.9rem;
    color: var(--secondary-text);
    line-height: 1.3;
  }

  .checking-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .login-required {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 40px 32px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .login-icon {
    font-size: 4rem;
    margin-bottom: 16px;
    color: var(--primary-color);
  }

  .login-required h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: var(--primary-text);
  }

  .login-required p {
    font-size: 1.1rem;
    color: var(--secondary-text);
    margin: 0 0 24px 0;
    line-height: 1.5;
  }

  .login-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 32px;
  }

  .login-actions .btn {
    min-width: 140px;
  }

  .login-help {
    padding: 20px;
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: 8px;
    text-align: left;
  }

  .login-help p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--info-text);
    line-height: 1.5;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 32px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
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
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .form-notice {
    margin-top: 24px;
    padding: 16px;
    background: var(--info-bg);
    border: 1px solid var(--info-border);
    border-radius: 8px;
  }

  .form-notice p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--info-text);
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .new-channel-container {
      padding: 24px 16px;
    }

    .new-channel-header h1 {
      font-size: 1.5rem;
    }

    .new-channel-form, .login-required {
      padding: 24px;
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
      font-size: 1.3rem;
    }
  }

  @media (prefers-color-scheme: dark) {
    .new-channel-container {
      --chat-bg: #36393f;
      --primary-text: #dcddde;
      --secondary-text: #b9bbbe;
      --text-color: #dcddde;
      --border-color: #42464d;
      --card-bg: #2f3136;
      --input-bg: #40444b;
      --disabled-bg: #42464d;
      --info-bg: #2f3136;
      --info-border: #42464d;
      --info-text: #b9bbbe;
    }
  }

  .char-count {
    text-align: right;
    font-size: 0.85rem;
    color: var(--secondary-text, #6c757d);
    margin-top: 4px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #e3e5e8);
    border-top: 3px solid var(--primary-color, #059669);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .thread-preview {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, #e3e5e8);
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }

  .thread-preview:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .thread-preview h3 {
    margin: 0 0 8px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-text, #1a1d21);
  }

  .thread-preview p {
    margin: 0;
    color: var(--secondary-text, #6c757d);
    line-height: 1.5;
  }

  .info-section {
    margin-top: 30px;
    padding: 20px;
    background: var(--info-bg, #e3f2fd);
    border: 1px solid var(--info-border, #bbdefb);
    border-radius: 8px;
  }

  .info-section h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--info-text, #1565c0);
  }

  .info-section ul {
    margin: 0;
    padding-left: 20px;
    color: var(--info-text, #1565c0);
  }

  .info-section li {
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .create-button {
    background: var(--primary-color, #059669);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-button:hover:not(:disabled) {
    background: var(--primary-color-hover, #047857);
    transform: translateY(-1px);
  }

  .create-button:disabled {
    background: var(--secondary-bg, #6c757d);
    cursor: not-allowed;
    transform: none;
  }

  .cancel-button {
    background: var(--secondary-bg-hover, #5a6169);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-button:disabled {
    background: var(--disabled-bg, #adb5bd);
    cursor: not-allowed;
  }

  .creating-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-weight: 500;
  }

  .creating-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .note-section {
    margin-top: 20px;
    padding: 16px;
    background: var(--info-bg, #e3f2fd);
    border: 1px solid var(--info-border, #bbdefb);
    border-radius: 6px;
  }

  .note-section p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--info-text, #1565c0);
    line-height: 1.4;
  }
</style>
