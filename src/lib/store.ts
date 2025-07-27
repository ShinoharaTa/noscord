import { writable, get } from "svelte/store";
import { getThreadList, type SingleThread } from "$lib/nostr";

const seckey = writable<string | null>(null);
const anonymous = writable<string | null>(null);
const expire = writable<string | null>(null);

function getLocalStorage() {
  try {
    const localStorageItem = localStorage.getItem("nchan_keys_v1");
    const parsed = JSON.parse(localStorageItem ?? "");
    seckey.set(parsed.seckey);
    anonymous.set(parsed.anonymous);
    expire.set(parsed.expire);
  } catch (e) {
    seckey.set(null);
    anonymous.set(null);
    expire.set(null);
    setLocalStorage();
  }
}

function setLocalStorage() {
  const keys = {
    seckey: get(seckey),
    anonymous: get(anonymous),
    expire: get(expire),
  };
  const keysString = JSON.stringify(keys);
  localStorage.setItem("nchan_keys_v1", keysString);
}

function initializeStores() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("nchan_private_key");
    localStorage.removeItem("nchan_private_key_expire");
    getLocalStorage();
  }
}

// seckeyとexpireをローカルストレージに保存する関数
export function saveToAnonymousKey(newSeckey: string, newExpire: string) {
  anonymous.set(newSeckey);
  expire.set(newExpire);
  setLocalStorage();
}

export function saveToIdentifiedKey(newSeckey: string) {
  seckey.set(newSeckey);
  setLocalStorage();
}

export function removeIdentifiedKey() {
  deleteSeckey();
}

// seckeyとexpireを破棄する関数
function clearAnonymous() {
  expire.set(null);
  anonymous.set(null);
  setLocalStorage();
}

function deleteSeckey() {
  seckey.set(null);
  setLocalStorage();
}

export function getAnonymousKey(): string | null {
  const currentExpire = get(expire);
  if (currentExpire && new Date(currentExpire) > new Date()) {
    return get(anonymous);
  }
  clearAnonymous();
  return null;
}

export function getSecKey(): string | null {
  return get(seckey);
}

initializeStores();

export const modal = writable<boolean>(false);
export const settingsModal = writable<boolean>(false);
export const selectedLimit = writable(100);

// =========================
// チャンネル一覧の共有ストア
// =========================

export const channelList = writable<SingleThread[]>([]);
export const channelLoading = writable<boolean>(false);

// 新しいAPI用のチャンネル一覧ストア
export const apiChannelList = writable<any[]>([]);
export const apiChannelLoading = writable<boolean>(false);

// 内部で並列呼び出しを抑制するためのフラグ
let isFetchingChannels = false;
let isFetchingApiChannels = false;

export async function loadChannelList(force = false) {
  if (!force && (isFetchingChannels || get(channelList).length > 0)) {
    // 既に読み込み済み or 取得中
    return;
  }
  isFetchingChannels = true;
  channelLoading.set(true);
  try {
    const list = await getThreadList();
    channelList.set(list);
  } catch (e) {
    console.error("Failed to load channel list", e);
  } finally {
    channelLoading.set(false);
    isFetchingChannels = false;
  }
}

export async function refreshChannelList() {
  return loadChannelList(true);
}

// 新しいAPIを使ったチャンネル一覧取得
export async function loadApiChannelList(
  sort: 'latest' | 'oldest' | 'created_new' | 'created_old' = 'latest',
  limit: number = 50,
  force = false
) {
  if (!force && isFetchingApiChannels) {
    return;
  }
  
  isFetchingApiChannels = true;
  apiChannelLoading.set(true);
  
  try {
    // 外部APIエンドポイントを使用
    const response = await fetch("https://thread.nchan.vip/channels", {
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    let list: any[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    
    // events が無い場合は空配列を補完
    list = list.map((item) => ({
      ...item,
      events: Array.isArray(item.events) ? item.events : [],
    }));
    
    // ソート処理
    switch (sort) {
      case 'latest':
        list.sort((a, b) => new Date(b.latest_update || 0).getTime() - new Date(a.latest_update || 0).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.latest_update || 0).getTime() - new Date(b.latest_update || 0).getTime());
        break;
      case 'created_new':
        list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'created_old':
        list.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
    }
    
    // リミット適用
    const limitedList = list.slice(0, Math.min(Math.max(limit, 1), 200));
    
    apiChannelList.set(limitedList);
  } catch (e) {
    console.error("Failed to load API channel list", e);
    apiChannelList.set([]);
  } finally {
    apiChannelLoading.set(false);
    isFetchingApiChannels = false;
  }
}

export async function refreshApiChannelList(
  sort: 'latest' | 'oldest' | 'created_new' | 'created_old' = 'latest',
  limit: number = 50
) {
  return loadApiChannelList(sort, limit, true);
}