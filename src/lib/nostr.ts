import { createRxForwardReq } from "rx-nostr";
import {
  generateSecretKey,
  finalizeEvent,
  kinds,
  SimplePool,
  getPublicKey,
} from "nostr-tools";
import { hexToBytes } from '@noble/hashes/utils';
import type { EventTemplate, UnsignedEvent } from "nostr-tools";
import { addDays, startOfDay, format } from "date-fns";
const pool = new SimplePool();
import { eventKind, NostrFetcher } from "nostr-fetch";
import type { NostrEvent, FetchFilter } from "nostr-fetch";
import { simplePoolAdapter } from "@nostr-fetch/adapter-nostr-tools";

export const req = createRxForwardReq();

export const relays = [
  "wss://relay-jp.nostr.wirednet.jp",
  "wss://r.kojira.io",
  "wss://yabu.me",
  "wss://relay-jp.shino3.net",
];

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

const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool));
export const getSingleItem = async (params: { kind: number; id: string }) => {
  const filters: FetchFilter = { kinds: [params.kind], "#e": [params.id] };
  const lastData: NostrEvent | undefined = await fetcher.fetchLastEvent(
    relays,
    filters
  );
  return lastData;
};

export const getSingleEvent = async (id: string) => {
  return await pool.get(relays, {
    kinds: [42],
    ids: [id],
  })
};

type SingleThread = {
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
  const result = await pool.get(relays, {
    kinds: [30078],
    "#d": ["nchan_list"],
  });
  return result ? JSON.parse(result.content) : [];
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


