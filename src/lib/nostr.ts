import { createRxForwardReq } from "rx-nostr";
import {
  generateSecretKey,
  finalizeEvent,
  kinds,
  SimplePool,
  getPublicKey,
} from "nostr-tools";
import { hexToBytes } from '@noble/hashes/utils';
import type { EventTemplate, UnsignedEvent, Event } from "nostr-tools";
import { addDays, startOfDay, format } from "date-fns";
const pool = new SimplePool();

export const req = createRxForwardReq();

export const relays = [
  "wss://relay-jp.nostr.wirednet.jp",
  "wss://r.kojira.io",
  "wss://yabu.me",
  "wss://relay-jp.shino3.net",
];

// カスタム絵文字を検出してタグを生成する関数
const extractEmojiTags = (content: string): [string, string][] => {
  const emojiPattern = /:([a-zA-Z0-9_+-]+):/g;
  const emojiTags: [string, string][] = [];
  const seenEmojis = new Set<string>();
  
  let match;
  while ((match = emojiPattern.exec(content)) !== null) {
    const emojiName = match[1];
    if (!seenEmojis.has(emojiName)) {
      seenEmojis.add(emojiName);
      // デフォルトの絵文字URL（実際の実装では適切なURLを設定）
      const emojiUrl = `https://emoji.example.com/${emojiName}.png`;
      emojiTags.push([emojiName, emojiUrl]);
    }
  }
  
  return emojiTags;
};

export const post = async (
  content: string,
  thread: string,
  seckey: string,
  reply: string | null
) => {
  const seckeyBytes = hexToBytes(seckey);
  const event: UnsignedEvent = {
    kind: kinds.ChannelMessage,
    content,
    tags: [],
    created_at: Math.floor(new Date().getTime() / 1000),
    pubkey: getPublicKey(seckeyBytes),
  };
  event.tags.push(["e", thread, "", "root"]);
  if (reply) {
    event.tags.push(["e", reply, "", "reply"]);
  }
  
  // カスタム絵文字タグを追加
  const emojiTags = extractEmojiTags(content);
  emojiTags.forEach(([shortcode, url]) => {
    event.tags.push(["emoji", shortcode, url]);
  });
  
  const post = finalizeEvent(event, seckeyBytes);
  
  return new Promise<boolean>((resolve, reject) => {
    const promises = pool.publish(relays, post);
    let successCount = 0;
    let failureCount = 0;
    const totalRelays = relays.length;
    let resolved = false;
    
    const relayResults: Record<string, 'pending' | 'success' | 'failed'> = {};
    relays.forEach(relay => {
      relayResults[relay] = 'pending';
    });
    
    promises.forEach((promise, index) => {
      const relay = relays[index];
      promise.then(() => {
        successCount++;
        relayResults[relay] = 'success';
        if (successCount === 1 && !resolved) {
          resolved = true;
          resolve(true);
        }
      }).catch((error) => {
        failureCount++;
        relayResults[relay] = 'failed';
        if (failureCount === totalRelays && !resolved) {
          resolved = true;
          reject(new Error(`すべてのリレーで投稿に失敗しました`));
        }
      });
    });
    
    // タイムアウト処理（10秒）
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (successCount > 0) {
          resolve(true);
        } else {
          reject(new Error("投稿がタイムアウトしました"));
        }
      }
    }, 10000);
  });
};

export const newThread = async (
  name: string,
  about: string,
  seckey: string
) => {
  const content = {
    name,
    about,
    picture: "https://nchan.shino3.net/channel_img.png",
  };
  const seckeyBytes = hexToBytes(seckey);
  const event: UnsignedEvent = {
    kind: kinds.ChannelCreation,
    content: JSON.stringify(content),
    tags: [],
    created_at: Math.floor(new Date().getTime() / 1000),
    pubkey: getPublicKey(seckeyBytes),
  };
  const post = finalizeEvent(event, seckeyBytes);
  
  return new Promise<string>((resolve, reject) => {
    const promises = pool.publish(relays, post);
    let successCount = 0;
    let failureCount = 0;
    const totalRelays = relays.length;
    
    promises.forEach((promise) => {
      promise.then(() => {
        successCount++;
        if (successCount > 0) {
          resolve(post.id);
        }
      }).catch((error) => {
        failureCount++;
        if (failureCount === totalRelays) {
          reject(new Error(`すべてのリレーでチャンネル作成に失敗しました`));
        }
      });
    });
    
    // タイムアウト処理（10秒）
    setTimeout(() => {
      if (successCount === 0) {
        reject(new Error("チャンネル作成がタイムアウトしました"));
      }
    }, 10000);
  });
};

export const getSingleItem = async (params: { kind: number; id: string }): Promise<Event | null> => {
  try {
    // nostr-toolsのpool.querySync()を使用して最新のイベントを取得
    const events = await pool.querySync(relays, {
      kinds: [params.kind],
      "#e": [params.id],
      limit: 1
    });
    
    // 最新のイベントを返す（created_atで降順ソート）
    if (events.length > 0) {
      const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
      return sortedEvents[0];
    }
    
    return null;
  } catch (error) {
    console.error("getSingleItem error:", error);
    return null;
  }
};

export const getSingleEvent = async (id: string) => {
  return await pool.get(relays, {
    kinds: [42],
    ids: [id],
  })
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
  // REST API から取得
  try {
    const response = await fetch("https://thread.nchan.vip/channels", {
      headers: {
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const json = await response.json();
      // API 形式: 配列 or { data: [...] }
      const list: any[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
      // events が無い場合は空配列を補完
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

  // REST API が失敗した場合は空配列を返す
  return [];
};

export const checkRelayConnections = async (): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {};
  
  for (const relay of relays) {
    try {
      const testEvent = await pool.get([relay], {
        kinds: [40], // Channel Creation
        limit: 1
      });
      results[relay] = !!testEvent;
    } catch (error) {
      results[relay] = false;
    }
  }
  
  return results;
};

export const getChannelMeta = async (id: string): Promise<string> => {
  const event = await pool.get(relays, {
      kinds: [40],
      ids: [id],
    });
    
  if(!event) {
    return "";
  }
  
  const metadata = await pool.querySync(relays, {
    kinds: [41],
    "#e": [id],
    authors: [event.pubkey],
    limit: 1
  });
  
  const latestMeta = metadata.length > 0 ? metadata.sort((a: any, b: any) => a.created_at - b.created_at)[0]: null;
  const parsedMeta = JSON.parse(latestMeta ? latestMeta.content : event.content);
  
  return parsedMeta.name || "";
};


