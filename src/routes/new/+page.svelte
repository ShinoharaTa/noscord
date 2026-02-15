<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { newThread, newThreadWithNip07, post, postWithNip07 } from "$lib/nostr";
  import { getSecKey, settingsModal, getUseNip07, nip07Available } from "$lib/store";
  import Icon from "$lib/components/icons.svelte";
  import "websocket-polyfill";
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

<div class="max-w-[600px] mx-auto py-6 px-4 md:py-10 md:px-6 bg-surface-chat min-h-dvh">
  <div class="mb-10">
    <h1 class="text-2xl md:text-3xl font-bold mb-2 text-[var(--primary-text)]">新しいチャンネルを作成</h1>
    <p class="text-foreground-secondary m-0 text-lg">新しいトピックを始めましょう</p>
  </div>

  {#if isChecking}
    <div class="flex flex-col items-center justify-center py-20 px-5 text-center">
      <div class="loading-spinner"></div>
      <p>認証状態を確認中...</p>
    </div>
  {:else if !isLoggedIn}
    <div class="bg-surface-card border border-border rounded-lg py-10 px-8 max-md:p-6 shadow-md">
      <div class="mb-4 text-accent">
        <Icon name="key" size={24} />
      </div>
      <h2 class="text-2xl max-md:text-xl font-semibold mb-4 text-[var(--primary-text)]">ログインが必要です</h2>
      <p class="text-lg text-foreground-secondary mb-6 leading-normal">チャンネルを作成するには、秘密鍵の登録が必要です。</p>
      <div class="flex gap-4 mb-8 max-md:flex-col">
        <button class="btn-primary flex items-center gap-2 py-3 px-6 border-none rounded-md text-base font-medium cursor-pointer transition-all bg-accent text-white shadow-sm min-w-[140px] max-md:w-full max-md:justify-center" on:click={() => settingsModal.set(true)}>
          キー管理を開く
        </button>
        <button class="btn-secondary flex items-center gap-2 py-3 px-6 rounded-md text-base font-medium cursor-pointer transition-all bg-surface-alt text-foreground border border-border min-w-[140px] max-md:w-full max-md:justify-center" on:click={cancel}>
          ホームに戻る
        </button>
      </div>
      <div class="p-5 bg-info-bg border border-info-border rounded-md text-left">
        <p class="m-0 text-sm text-info-text leading-normal">
          <strong>初回利用の場合:</strong><br>
          キー管理で新しい秘密鍵を生成するか、既存の秘密鍵を登録してください。
        </p>
      </div>
    </div>
  {:else}
    <div class="bg-surface-card border border-border rounded-lg p-8 max-md:p-6 shadow-md">
      <div class="mb-6">
        <label class="block font-semibold text-[var(--primary-text)] mb-2 text-base" for="channel-name">
          チャンネル名 <span class="text-error">*</span>
        </label>
        <input 
          id="channel-name"
          type="text" 
          bind:value={name} 
          placeholder="例: 雑談、技術議論、ニュース"
          class="form-input w-full py-3 px-4 border border-border rounded-md bg-surface-input text-foreground text-base leading-snug transition-all font-[inherit] max-w-full"
          maxlength="100"
          disabled={isSubmitting}
        />
        <small class="block mt-1 text-sm text-foreground-secondary leading-tight">チャンネルの目的が分かりやすい名前をつけましょう</small>
      </div>

      <div class="mb-6">
        <label class="block font-semibold text-[var(--primary-text)] mb-2 text-base" for="first-message">
          最初のメッセージ <span class="text-error">*</span>
        </label>
        <textarea 
          id="first-message"
          bind:value={postContent} 
          placeholder="このチャンネルの目的や、最初のトピックを書いてください..."
          class="form-input w-full py-3 px-4 border border-border rounded-md bg-surface-input text-foreground text-base leading-snug transition-all font-[inherit] max-w-full resize-y min-h-[100px]"
          rows="4"
          maxlength="1000"
          disabled={isSubmitting}
        ></textarea>
        <small class="block mt-1 text-sm text-foreground-secondary leading-tight">他の人が参加しやすくなるような説明を書いてください</small>
      </div>

      <div class="flex gap-3 justify-end mt-8 max-md:flex-col">
        <button 
          class="btn-secondary flex items-center gap-2 py-3 px-6 rounded-md text-base font-medium cursor-pointer transition-all bg-surface-alt text-foreground border border-border max-md:w-full max-md:justify-center" 
          on:click={cancel}
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button 
          class="btn-primary flex items-center gap-2 py-3 px-6 border-none rounded-md text-base font-medium cursor-pointer transition-all bg-accent text-white shadow-sm max-md:w-full max-md:justify-center" 
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

      <div class="mt-6 p-4 bg-info-bg border border-info-border rounded-md">
        <p class="m-0 text-sm text-info-text leading-snug">
          <strong>注意:</strong> 新しいチャンネルが一覧に反映されるまで、最大5分程度かかる場合があります。
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  /* フォーム要素のフォーカス・無効化スタイル */
  .form-input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-alpha);
    outline: none;
  }

  .form-input:disabled {
    background: var(--disabled-bg);
    cursor: not-allowed;
  }

  /* ボタンのホバー・無効化 */
  .btn-primary:hover:not(:disabled) {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    background: var(--disabled-bg);
    cursor: not-allowed;
    transform: none;
  }

  /* スピナー */
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 9999px;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 9999px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
