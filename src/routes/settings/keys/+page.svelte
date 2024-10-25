<script lang="ts">
  import NavigationBar from "$lib/components/navbar.svelte";
  import {
    getAnonymousKey,
    getSecKey,
    removeIdentifiedKey,
    saveToAnonymousKey,
    saveToIdentifiedKey,
  } from "$lib/store";
  import { nip19 } from "nostr-tools";

  let identifiedNsec: string | null;
  let anonymousNsec: string | null;
  if (typeof window !== "undefined") {
    const anonymous = getAnonymousKey();
    const identified = getSecKey();
    anonymousNsec = anonymous ? nip19.nsecEncode(anonymous) : "";
    identifiedNsec = identified ? nip19.nsecEncode(identified) : "";
  }

  const onClickSetPrivateKey = () => {
    try {
      const decode = nip19.decode(identifiedNsec ?? "");
      if (decode.type !== "nsec") {
        throw new Error("エラー");
      }
      saveToIdentifiedKey(decode.data);
      window.alert("鍵を保存しました。");
    } catch (e) {
      window.alert("nsec1xxxxxx..... の秘密鍵を入力してください");
      return;
    }
  };

  const onClickRemovePrivateKey = () => {
    if (window.confirm("登録済みの秘密鍵を削除してもよろしいですか？")) {
      removeIdentifiedKey();
      identifiedNsec = "";
    }
  };
</script>

<NavigationBar>
  <div slot="left">
    <a href="/"><img src="/left.svg" class="path" alt="" height="24px" /></a>
  </div>
  <div slot="right">
    <img src="/blank.svg" alt="" height="24px" />
  </div>
</NavigationBar>
<div>
  <label>
    コテハンに使用する秘密鍵:<br />
    <input
      type="text"
      bind:value={identifiedNsec}
      placeholder="nsec1..... で始まる鍵を登録"
    />
  </label>
  <div class="flex">
    <button on:click={onClickSetPrivateKey}>秘密鍵を使用する</button>
    <button on:click={onClickRemovePrivateKey}>秘密鍵を削除する</button>
  </div>
</div>
