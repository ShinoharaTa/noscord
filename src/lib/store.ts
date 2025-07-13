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

// 内部で並列呼び出しを抑制するためのフラグ
let isFetchingChannels = false;

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