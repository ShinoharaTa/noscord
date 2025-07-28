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

// カスタム絵文字機能は表示のみサポート（投稿時のタグ生成は無効化）

export const post = async (
  content: string,
  thread: string,
  seckey: string,
  reply: string | null,
  imageUrls: string[] = []
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
  
  // 画像URLがある場合はimetaタグとcontentに追加（NIP-92準拠）
  if (imageUrls && imageUrls.length > 0) {
    const urls = imageUrls.filter(url => !url.startsWith('data:'));
    const base64Images = imageUrls.filter(url => url.startsWith('data:'));
    
    // 外部画像URLはimetaタグとcontentに追加
    if (urls.length > 0) {
      urls.forEach(url => {
        // imetaタグを追加（NIP-92）
        event.tags.push(["imeta", `url ${url}`, `m image/jpeg`]);
      });
      // contentに画像URLを追加
      event.content = content + '\n\n' + urls.join('\n');
    }
    
    // Base64画像はcontentに直接追加
    if (base64Images.length > 0) {
      event.content = content + '\n\n' + base64Images.join('\n');
    }
  }
  
  // カスタム絵文字タグの追加は現在無効化（表示のみサポート）
  
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

// NIP-07を使った投稿機能
export const postWithNip07 = async (
  content: string,
  thread: string,
  reply: string | null,
  imageUrls: string[] = []
): Promise<boolean> => {
  if (!window.nostr) {
    throw new Error('NIP-07ブラウザ拡張機能が見つかりません');
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    
    const event = {
      kind: kinds.ChannelMessage,
      content,
      tags: [] as string[][],
      created_at: Math.floor(new Date().getTime() / 1000),
      pubkey,
    };
    
    event.tags.push(["e", thread, "", "root"]);
    if (reply) {
      event.tags.push(["e", reply, "", "reply"]);
    }
    
    // 画像URLがある場合はimetaタグとcontentに追加（NIP-92準拠）
    if (imageUrls && imageUrls.length > 0) {
      const urls = imageUrls.filter(url => !url.startsWith('data:'));
      const base64Images = imageUrls.filter(url => url.startsWith('data:'));
      
              // 外部画像URLはimetaタグとcontentに追加
        if (urls.length > 0) {
          urls.forEach(url => {
            // imetaタグを追加（NIP-92）
            event.tags.push(["imeta", `url ${url}`, `m image/jpeg`]);
          });
          // contentに画像URLを追加
          event.content = content + '\n\n' + urls.join('\n');
        }
      
      // Base64画像はcontentに直接追加
      if (base64Images.length > 0) {
        event.content = content + '\n\n' + base64Images.join('\n');
      }
    }
    
    // カスタム絵文字タグの追加は現在無効化（表示のみサポート）
    
    const signedEvent = await window.nostr.signEvent(event);
    
    return new Promise<boolean>((resolve, reject) => {
      const promises = pool.publish(relays, signedEvent);
      let successCount = 0;
      let failureCount = 0;
      const totalRelays = relays.length;
      let resolved = false;
      
      promises.forEach((promise) => {
        promise.then(() => {
          successCount++;
          if (successCount === 1 && !resolved) {
            resolved = true;
            resolve(true);
          }
        }).catch((error) => {
          failureCount++;
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
  } catch (error) {
    throw new Error(`NIP-07での署名に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
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

// NIP-07を使ったチャンネル作成機能
export const newThreadWithNip07 = async (
  name: string,
  about: string
): Promise<string> => {
  if (!window.nostr) {
    throw new Error('NIP-07ブラウザ拡張機能が見つかりません');
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    
    const content = {
      name,
      about,
      picture: "https://nchan.shino3.net/channel_img.png",
    };
    
    const event = {
      kind: kinds.ChannelCreation,
      content: JSON.stringify(content),
      tags: [] as string[][],
      created_at: Math.floor(new Date().getTime() / 1000),
      pubkey,
    };
    
    const signedEvent = await window.nostr.signEvent(event);
    
    return new Promise<string>((resolve, reject) => {
      const promises = pool.publish(relays, signedEvent);
      let successCount = 0;
      let failureCount = 0;
      const totalRelays = relays.length;
      
      promises.forEach((promise) => {
        promise.then(() => {
          successCount++;
          if (successCount > 0) {
            resolve(signedEvent.id);
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
  } catch (error) {
    throw new Error(`NIP-07でのチャンネル作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
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

// リアクション投稿（NIP-25）
export const react = async (
  content: string, // 絵文字や"+"、"-"など
  targetEventId: string,
  targetEventAuthor: string,
  seckey: string
) => {
  const seckeyBytes = hexToBytes(seckey);
  const event: UnsignedEvent = {
    kind: 7, // NIP-25 Reaction
    content,
    tags: [],
    created_at: Math.floor(new Date().getTime() / 1000),
    pubkey: getPublicKey(seckeyBytes),
  };
  
  // 対象の投稿を参照
  event.tags.push(["e", targetEventId]);
  event.tags.push(["p", targetEventAuthor]);
  
  // カスタム絵文字の場合、emojiタグを追加
  addCustomEmojiTags(event, content);
  
  const reaction = finalizeEvent(event, seckeyBytes);
  
  return new Promise<boolean>((resolve, reject) => {
    const promises = pool.publish(relays, reaction);
    let successCount = 0;
    let failureCount = 0;
    const totalRelays = relays.length;
    let resolved = false;
    
    promises.forEach((promise) => {
      promise.then(() => {
        successCount++;
        if (successCount === 1 && !resolved) {
          resolved = true;
          resolve(true);
        }
      }).catch((error) => {
        failureCount++;
        if (failureCount === totalRelays && !resolved) {
          resolved = true;
          reject(new Error(`すべてのリレーでリアクションに失敗しました`));
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
          reject(new Error("リアクションがタイムアウトしました"));
        }
      }
    }, 10000);
  });
};

// NIP-07を使ったリアクション投稿
export const reactWithNip07 = async (
  content: string, // 絵文字や"+"、"-"など
  targetEventId: string,
  targetEventAuthor: string
): Promise<boolean> => {
  if (!window.nostr) {
    throw new Error('NIP-07ブラウザ拡張機能が見つかりません');
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    
    const event = {
      kind: 7, // NIP-25 Reaction
      content,
      tags: [] as string[][],
      created_at: Math.floor(new Date().getTime() / 1000),
      pubkey,
    };
    
    // 対象の投稿を参照
    event.tags.push(["e", targetEventId]);
    event.tags.push(["p", targetEventAuthor]);
    
    addCustomEmojiTags(event, content);
    
    const signedEvent = await window.nostr.signEvent(event);
    
    return new Promise<boolean>((resolve, reject) => {
      const promises = pool.publish(relays, signedEvent);
      let successCount = 0;
      let failureCount = 0;
      const totalRelays = relays.length;
      let resolved = false;
      
      promises.forEach((promise) => {
        promise.then(() => {
          successCount++;
          if (successCount === 1 && !resolved) {
            resolved = true;
            resolve(true);
          }
        }).catch((error) => {
          failureCount++;
          if (failureCount === totalRelays && !resolved) {
            resolved = true;
            reject(new Error(`すべてのリレーでリアクションに失敗しました`));
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
            reject(new Error("リアクションがタイムアウトしました"));
          }
        }
      }, 10000);
    });
  } catch (error) {
    throw new Error(`NIP-07でのリアクションに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 特定投稿のリアクションを取得
export const getReactions = async (eventId: string): Promise<Event[]> => {
  try {
    const reactions = await pool.querySync(relays, {
      kinds: [7], // Reaction kind
      "#e": [eventId],
      limit: 100
    });
    
    return reactions.sort((a, b) => a.created_at - b.created_at);
  } catch (error) {
    console.error("リアクション取得エラー:", error);
    return [];
  }
};



// リアクション削除（NIP-09）
export const deleteReaction = async (
  reactionEventId: string,
  seckey: string,
  reason: string = "リアクションを取り消しました"
) => {
  const seckeyBytes = hexToBytes(seckey);
  const event: UnsignedEvent = {
    kind: 5, // NIP-09 Event Deletion
    content: reason,
    tags: [],
    created_at: Math.floor(new Date().getTime() / 1000),
    pubkey: getPublicKey(seckeyBytes),
  };
  
  // 削除対象のリアクションを参照
  event.tags.push(["e", reactionEventId]);
  
  const deletion = finalizeEvent(event, seckeyBytes);
  
  return new Promise<boolean>((resolve, reject) => {
    const promises = pool.publish(relays, deletion);
    let successCount = 0;
    let failureCount = 0;
    const totalRelays = relays.length;
    let resolved = false;
    
    promises.forEach((promise) => {
      promise.then(() => {
        successCount++;
        if (successCount === 1 && !resolved) {
          resolved = true;
          resolve(true);
        }
      }).catch((error) => {
        failureCount++;
        if (failureCount === totalRelays && !resolved) {
          resolved = true;
          reject(new Error(`すべてのリレーでリアクション削除に失敗しました`));
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
          reject(new Error("リアクション削除がタイムアウトしました"));
        }
      }
    }, 10000);
  });
};

// NIP-07を使ったリアクション削除
export const deleteReactionWithNip07 = async (
  reactionEventId: string,
  reason: string = "リアクションを取り消しました"
): Promise<boolean> => {
  if (!window.nostr) {
    throw new Error('NIP-07ブラウザ拡張機能が見つかりません');
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    
    const event = {
      kind: 5, // NIP-09 Event Deletion
      content: reason,
      tags: [] as string[][],
      created_at: Math.floor(new Date().getTime() / 1000),
      pubkey,
    };
    
    // 削除対象のリアクションを参照
    event.tags.push(["e", reactionEventId]);
    
    const signedEvent = await window.nostr.signEvent(event);
    
    return new Promise<boolean>((resolve, reject) => {
      const promises = pool.publish(relays, signedEvent);
      let successCount = 0;
      let failureCount = 0;
      const totalRelays = relays.length;
      let resolved = false;
      
      promises.forEach((promise) => {
        promise.then(() => {
          successCount++;
          if (successCount === 1 && !resolved) {
            resolved = true;
            resolve(true);
          }
        }).catch((error) => {
          failureCount++;
          if (failureCount === totalRelays && !resolved) {
            resolved = true;
            reject(new Error(`すべてのリレーでリアクション削除に失敗しました`));
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
            reject(new Error("リアクション削除がタイムアウトしました"));
          }
        }
      }, 10000);
    });
  } catch (error) {
    throw new Error(`NIP-07でのリアクション削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// カスタム絵文字タグを追加する共通関数
const addCustomEmojiTags = (event: any, content: string) => {
  const shortcodeMatch = content.match(/^:([a-zA-Z0-9_+-]+):$/);
  if (shortcodeMatch) {
    const shortcode = shortcodeMatch[1];
    
    // 一般的なカスタム絵文字のマッピング（テスト用）
    const commonEmojiUrls: Record<string, string> = {
      'heart': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',
      'thumbsup': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png',
      'fire': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
      'rocket': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png'
    };
    
    const emojiUrl = commonEmojiUrls[shortcode];
    if (emojiUrl) {
      event.tags.push(["emoji", shortcode, emojiUrl]);
      console.log(`カスタム絵文字リアクション送信: :${shortcode}: -> ${emojiUrl}`);
    }
  }
};


