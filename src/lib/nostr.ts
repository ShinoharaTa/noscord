import { createRxForwardReq } from "rx-nostr";
import {
  generateSecretKey,
  finalizeEvent,
  kinds,
  SimplePool,
  getPublicKey,
} from "nostr-tools";
import { hexToBytes } from '@noble/hashes/utils.js';
import type { EventTemplate, UnsignedEvent, Event } from "nostr-tools";
import { addDays, startOfDay, format } from "date-fns";
const pool = new SimplePool();

export const req = createRxForwardReq();

const DEFAULT_RELAYS = [
  "wss://relay-jp.nostr.wirednet.jp",
  "wss://r.kojira.io",
  "wss://yabu.me",
  "wss://relay-jp.shino3.net",
];

let _relays = [...DEFAULT_RELAYS];

export function getRelays(): string[] {
  return _relays;
}

export function setRelays(newRelays: string[]) {
  _relays = newRelays.length > 0 ? [...newRelays] : [...DEFAULT_RELAYS];
}

export function addRelay(url: string) {
  if (!_relays.includes(url)) {
    _relays = [..._relays, url];
  }
}

export function removeRelay(url: string) {
  _relays = _relays.filter(r => r !== url);
  if (_relays.length === 0) _relays = [...DEFAULT_RELAYS];
}

/** 後方互換のための export */
export { _relays as relays };

// --- publish 共通ヘルパー ---

function publishToRelays<T>(
  signedEvent: Event | any,
  errorLabel: string,
  extractResult?: (event: any) => T
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const currentRelays = getRelays();
    const promises = pool.publish(currentRelays, signedEvent);
    let successCount = 0;
    let failureCount = 0;
    const total = currentRelays.length;
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (successCount > 0) {
          resolve(extractResult ? extractResult(signedEvent) : true as unknown as T);
        } else {
          reject(new Error(`${errorLabel}がタイムアウトしました`));
        }
      }
    }, 10000);

    promises.forEach((promise) => {
      promise
        .then(() => {
          successCount++;
          if (successCount === 1 && !settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve(extractResult ? extractResult(signedEvent) : true as unknown as T);
          }
        })
        .catch(() => {
          failureCount++;
          if (failureCount === total && !settled) {
            settled = true;
            clearTimeout(timeoutId);
            reject(new Error(`すべてのリレーで${errorLabel}に失敗しました`));
          }
        });
    });
  });
}

// --- イベント構築ヘルパー ---

function buildChannelMessageEvent(
  content: string,
  thread: string,
  reply: string | null,
  imageUrls: string[],
  pubkey: string
) {
  const tags: string[][] = [["e", thread, "", "root"]];
  if (reply) tags.push(["e", reply, "", "reply"]);

  let finalContent = content;

  if (imageUrls.length > 0) {
    const urls = imageUrls.filter(url => !url.startsWith('data:'));
    const base64Images = imageUrls.filter(url => url.startsWith('data:'));

    if (urls.length > 0) {
      urls.forEach(url => tags.push(["imeta", `url ${url}`, `m image/jpeg`]));
      finalContent = content + '\n\n' + urls.join('\n');
    }
    if (base64Images.length > 0) {
      finalContent = (finalContent === content ? content : finalContent) + '\n\n' + base64Images.join('\n');
    }
  }

  return {
    kind: kinds.ChannelMessage,
    content: finalContent,
    tags,
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
  };
}

function buildChannelCreationEvent(name: string, about: string, pubkey: string) {
  return {
    kind: kinds.ChannelCreation,
    content: JSON.stringify({ name, about, picture: "https://nchan.shino3.net/channel_img.png" }),
    tags: [] as string[][],
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
  };
}

function buildReactionEvent(content: string, targetEventId: string, targetEventAuthor: string, pubkey: string) {
  const tags: string[][] = [["e", targetEventId], ["p", targetEventAuthor]];

  const shortcodeMatch = content.match(/^:([a-zA-Z0-9_+-]+):$/);
  if (shortcodeMatch) {
    const shortcode = shortcodeMatch[1];
    const commonEmojiUrls: Record<string, string> = {
      'heart': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',
      'thumbsup': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png',
      'fire': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
      'rocket': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png',
    };
    const emojiUrl = commonEmojiUrls[shortcode];
    if (emojiUrl) tags.push(["emoji", shortcode, emojiUrl]);
  }

  return {
    kind: 7,
    content,
    tags,
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
  };
}

function buildDeletionEvent(targetEventId: string, pubkey: string, reason: string) {
  return {
    kind: 5,
    content: reason,
    tags: [["e", targetEventId]] as string[][],
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
  };
}

// --- NIP-07 署名ヘルパー ---

async function signWithNip07(event: any): Promise<any> {
  if (!window.nostr) {
    throw new Error('NIP-07ブラウザ拡張機能が見つかりません');
  }
  try {
    return await window.nostr.signEvent(event);
  } catch (error) {
    throw new Error(`NIP-07での署名に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function signWithSeckey(event: UnsignedEvent, seckey: string): Event {
  const seckeyBytes = hexToBytes(seckey);
  return finalizeEvent(event, seckeyBytes);
}

// ==========================================
// 公開 API
// ==========================================

// --- 投稿 ---

export const post = async (
  content: string,
  thread: string,
  seckey: string,
  reply: string | null,
  imageUrls: string[] = []
) => {
  const seckeyBytes = hexToBytes(seckey);
  const unsigned = buildChannelMessageEvent(content, thread, reply, imageUrls, getPublicKey(seckeyBytes));
  const signed = finalizeEvent(unsigned as UnsignedEvent, seckeyBytes);
  return publishToRelays<boolean>(signed, "投稿");
};

export const postWithNip07 = async (
  content: string,
  thread: string,
  reply: string | null,
  imageUrls: string[] = []
): Promise<boolean> => {
  const pubkey = await window.nostr!.getPublicKey();
  const event = buildChannelMessageEvent(content, thread, reply, imageUrls, pubkey);
  const signed = await signWithNip07(event);
  return publishToRelays<boolean>(signed, "投稿");
};

// --- チャンネル作成 ---

export const newThread = async (name: string, about: string, seckey: string) => {
  const seckeyBytes = hexToBytes(seckey);
  const unsigned = buildChannelCreationEvent(name, about, getPublicKey(seckeyBytes));
  const signed = finalizeEvent(unsigned as UnsignedEvent, seckeyBytes);
  return publishToRelays<string>(signed, "チャンネル作成", (e) => e.id);
};

export const newThreadWithNip07 = async (name: string, about: string): Promise<string> => {
  const pubkey = await window.nostr!.getPublicKey();
  const event = buildChannelCreationEvent(name, about, pubkey);
  const signed = await signWithNip07(event);
  return publishToRelays<string>(signed, "チャンネル作成", (e) => e.id);
};

// --- リアクション ---

export const react = async (
  content: string,
  targetEventId: string,
  targetEventAuthor: string,
  seckey: string
) => {
  const seckeyBytes = hexToBytes(seckey);
  const unsigned = buildReactionEvent(content, targetEventId, targetEventAuthor, getPublicKey(seckeyBytes));
  const signed = finalizeEvent(unsigned as UnsignedEvent, seckeyBytes);
  return publishToRelays<boolean>(signed, "リアクション");
};

export const reactWithNip07 = async (
  content: string,
  targetEventId: string,
  targetEventAuthor: string
): Promise<boolean> => {
  const pubkey = await window.nostr!.getPublicKey();
  const event = buildReactionEvent(content, targetEventId, targetEventAuthor, pubkey);
  const signed = await signWithNip07(event);
  return publishToRelays<boolean>(signed, "リアクション");
};

// --- リアクション削除 ---

export const deleteReaction = async (
  reactionEventId: string,
  seckey: string,
  reason: string = "リアクションを取り消しました"
) => {
  const seckeyBytes = hexToBytes(seckey);
  const unsigned = buildDeletionEvent(reactionEventId, getPublicKey(seckeyBytes), reason);
  const signed = finalizeEvent(unsigned as UnsignedEvent, seckeyBytes);
  return publishToRelays<boolean>(signed, "リアクション削除");
};

export const deleteReactionWithNip07 = async (
  reactionEventId: string,
  reason: string = "リアクションを取り消しました"
): Promise<boolean> => {
  const pubkey = await window.nostr!.getPublicKey();
  const event = buildDeletionEvent(reactionEventId, pubkey, reason);
  const signed = await signWithNip07(event);
  return publishToRelays<boolean>(signed, "リアクション削除");
};

// --- 読み取り ---

export const getReactions = async (eventId: string): Promise<Event[]> => {
  try {
    const reactions = await pool.querySync(getRelays(), {
      kinds: [7],
      "#e": [eventId],
      limit: 100,
    });
    return reactions.sort((a, b) => a.created_at - b.created_at);
  } catch (error) {
    console.error("リアクション取得エラー:", error);
    return [];
  }
};

export const getSingleItem = async (params: { kind: number; id: string }): Promise<Event | null> => {
  try {
    const events = await pool.querySync(getRelays(), {
      kinds: [params.kind],
      "#e": [params.id],
      limit: 1,
    });
    if (events.length > 0) {
      return events.sort((a, b) => b.created_at - a.created_at)[0];
    }
    return null;
  } catch (error) {
    console.error("getSingleItem error:", error);
    return null;
  }
};

export const getSingleEvent = async (id: string) => {
  return await pool.get(getRelays(), {
    kinds: [42],
    ids: [id],
  });
};

export type SingleThread = {
  id: string;
  author: string;
  latest_update: number;
  name: string;
  events: {
    content: string;
    pubkey: string;
    created_at: number;
  }[];
};

export const getThreadList = async (): Promise<SingleThread[]> => {
  try {
    const response = await fetch("https://thread.nchan.vip/channels", {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const json = await response.json();
      const list: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      return list.map((item) => ({
        ...item,
        events: Array.isArray(item.events) ? item.events : [],
      })) as SingleThread[];
    } else {
      console.warn(`REST API returned status ${response.status}`);
    }
  } catch (error) {
    console.warn("Failed to fetch channel list via REST API", error);
  }
  return [];
};

export const checkRelayConnections = async (): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {};
  for (const relay of getRelays()) {
    try {
      const testEvent = await pool.get([relay], { kinds: [40], limit: 1 });
      results[relay] = !!testEvent;
    } catch {
      results[relay] = false;
    }
  }
  return results;
};

export const getChannelMeta = async (id: string): Promise<string> => {
  const currentRelays = getRelays();
  const event = await pool.get(currentRelays, { kinds: [40], ids: [id] });

  if (!event) return "";

  const metadata = await pool.querySync(currentRelays, {
    kinds: [41],
    "#e": [id],
    authors: [event.pubkey],
    limit: 1,
  });

  const latestMeta = metadata.length > 0 ? metadata.sort((a, b) => a.created_at - b.created_at)[0] : null;
  const parsedMeta = JSON.parse(latestMeta ? latestMeta.content : event.content);

  return parsedMeta.name || "";
};
