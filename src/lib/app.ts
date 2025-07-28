import { format, fromUnixTime } from "date-fns";

export const parseCreated = (time: number) =>
  format(fromUnixTime(time), "yyyy/MM/dd HH:mm:ss");

export const parseTimeOnly = (time: number) =>
  format(fromUnixTime(time), "HH:mm:ss");

export function parseContent(text: string) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const twitterPattern = /(https?:\/\/(twitter\.com|x\.com)\/[^\s]+)/g;
  const imagePattern = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/g;
  const youtubePattern = /(https?:\/\/www\.youtube\.com\/watch\?v=[^\s]+)/g;
  
  const urls: string[] = text.match(urlPattern) || [];
  const twitterUrls: string[] = text.match(twitterPattern) || [];
  const imageUrls: string[] = text.match(imagePattern) || [];
  const youtubeUrls: string[] = text.match(youtubePattern) || [];

  const textWithoutUrls = text.replace(urlPattern, "").trim();

  const otherUrls = urls.filter(
    (url) =>
      !twitterUrls.includes(url) &&
      !imageUrls.includes(url) &&
      !youtubeUrls.includes(url)
  );

  return {
    original_text: text,
    urls,
    text_without_urls: textWithoutUrls,
    twitter_urls: twitterUrls,
    image_urls: imageUrls,
    youtube_urls: youtubeUrls,
    other_urls: otherUrls,
  };
}

// NIP-30 カスタム絵文字処理関数
export function processCustomEmojis(text: string, event: any): string {
  if (!text) return text;

  // まずNIP-30のemojiタグをマッピング
  let emojiMap: Record<string, string> = {};
  if (event && event.tags) {
    const emojiTags = event.tags.filter((tag: any) => tag[0] === 'emoji');
    emojiTags.forEach((tag: any) => {
      if (tag.length >= 3) {
        emojiMap[tag[1]] = tag[2];
      }
    });
  }

  // インラインstyleで強制サイズ指定
  const style = 'width:1em;height:1em;max-width:1em;max-height:1em;vertical-align:middle;display:inline-block;object-fit:contain;';

  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, shortcode) => {
    if (match.includes('custom-emoji')) return match;
    const url = emojiMap[shortcode];
    
    // 適切なURLが存在する場合のみ画像として表示
    if (url && !url.includes('emoji.example.com')) {
      return `<img src="${url}" alt=":${shortcode}:" class="custom-emoji" title=":${shortcode}:" style="${style}" />`;
    }
    
    // URLが存在しない場合はそのままテキストとして表示
    return match;
  });
}

// 絵文字タグからマッピングを作成する関数
export function createEmojiMapping(event: any): Record<string, string> {
  if (!event || !event.tags) return {};
  
  const emojiMapping: Record<string, string> = {};
  const emojiTags = event.tags.filter((tag: any) => tag[0] === 'emoji');
  
  emojiTags.forEach((tag: any) => {
    if (tag.length >= 3) {
      const shortcode = tag[1];
      const url = tag[2];
      emojiMapping[shortcode] = url;
    }
  });
  
  return emojiMapping;
}

// リアクションデータを集計する関数
export interface ReactionSummary {
  content: string;
  count: number;
  users: string[];
  hasCurrentUser: boolean;
  currentUserReactionId?: string; // 自分のリアクションのID
  sampleEvent?: any; // 絵文字マッピング用のサンプルイベント
}

export function aggregateReactions(reactions: any[], currentUserPubkey?: string): ReactionSummary[] {
  const reactionMap = new Map<string, ReactionSummary>();
  
  reactions.forEach((reaction) => {
    const content = reaction.content;
    if (!content) return;
    
    if (reactionMap.has(content)) {
      const existing = reactionMap.get(content)!;
      // すべてのリアクションを1件ずつカウント（重複チェックなし）
      existing.count++;
      if (!existing.users.includes(reaction.pubkey)) {
        existing.users.push(reaction.pubkey);
      }
      if (currentUserPubkey && reaction.pubkey === currentUserPubkey) {
        existing.hasCurrentUser = true;
        existing.currentUserReactionId = reaction.id;
      }
    } else {
      reactionMap.set(content, {
        content,
        count: 1,
        users: [reaction.pubkey],
        hasCurrentUser: currentUserPubkey ? reaction.pubkey === currentUserPubkey : false,
        currentUserReactionId: currentUserPubkey && reaction.pubkey === currentUserPubkey ? reaction.id : undefined,
        sampleEvent: reaction // 絵文字マッピング用にサンプルイベントを保存
      });
    }
  });
  
  return Array.from(reactionMap.values()).sort((a, b) => b.count - a.count);
}

// リアクションコンテンツをサニタイズする関数
export function sanitizeReactionContent(content: string): string {
  // 危険な文字列を除去し、絵文字のみを許可
  // ショートコード形式の場合は長めに許可（最大20文字）
  const maxLength = content.startsWith(':') && content.includes(':') ? 20 : 10;
  return content.replace(/[<>\"'&]/g, '').slice(0, maxLength);
}

// リアクション用の絵文字処理関数
export function processReactionEmoji(content: string, reactionEvent?: any): string {
  if (!content) return content;
  
  // まず安全性のためサニタイズ
  const safeContent = sanitizeReactionContent(content);
  
  // デバッグ: リアクションイベントの内容を確認
  if (reactionEvent && safeContent.startsWith(':')) {
    console.log('カスタム絵文字リアクション処理:', {
      originalContent: content,
      safeContent: safeContent,
      contentLength: content.length,
      safeContentLength: safeContent.length,
      eventTags: reactionEvent.tags,
      eventId: reactionEvent.id?.slice(0, 8) + '...'
    });
  }
  
  // リアクションイベントにemojiタグがある場合、そのマッピングを使用
  let emojiMap: Record<string, string> = {};
  if (reactionEvent && reactionEvent.tags) {
    const emojiTags = reactionEvent.tags.filter((tag: any) => tag[0] === 'emoji');
    emojiTags.forEach((tag: any) => {
      if (tag.length >= 3) {
        emojiMap[tag[1]] = tag[2];
      }
    });
    
    if (emojiTags.length > 0) {
      console.log('見つかったemojiタグ:', emojiTags);
    }
  }
  
  // ショートコード形式 (:shortcode:) をチェック
  const shortcodeMatch = safeContent.match(/^:([a-zA-Z0-9_+-]+):?$/); // 末尾の:がなくても対応
  if (shortcodeMatch) {
    const shortcode = shortcodeMatch[1];
    const url = emojiMap[shortcode];
    
    console.log(`ショートコード "${shortcode}" の処理:`, {
      originalContent: content,
      safeContent: safeContent,
      shortcode: shortcode,
      url,
      hasMapping: !!url,
      emojiMapKeys: Object.keys(emojiMap),
      emojiMapValues: Object.values(emojiMap)
    });
    
    if (url && !url.includes('emoji.example.com')) {
      // カスタム絵文字として表示
      const style = 'width:1.2em;height:1.2em;vertical-align:middle;display:inline-block;object-fit:contain;';
      return `<img src="${url}" alt=":${shortcode}:" class="reaction-emoji-img" title=":${shortcode}:" style="${style}" />`;
    }
    
    // フォールバック: 一般的なカスタム絵文字のマッピング（テスト用）
    const commonEmojiMap: Record<string, string> = {
      'heart': '❤️',
      'thumbsup': '👍',
      'thumbsdown': '👎',
      'fire': '🔥',
      'rocket': '🚀',
      'eyes': '👀',
      'thinking': '🤔',
      'laughing': '😂',
      'cry': '😢',
      'angry': '😠',
      'sushiyuki': '🍣' // テスト用にsushiyukiを追加
    };
    
    if (commonEmojiMap[shortcode]) {
      console.log(`フォールバック絵文字適用: ${shortcode} -> ${commonEmojiMap[shortcode]}`);
      return commonEmojiMap[shortcode];
    }
  }
  
  // 通常の絵文字（Unicode）や未知のショートコードはそのまま表示
  return safeContent;
}
