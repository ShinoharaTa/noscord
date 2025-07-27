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
        currentUserReactionId: currentUserPubkey && reaction.pubkey === currentUserPubkey ? reaction.id : undefined
      });
    }
  });
  
  return Array.from(reactionMap.values()).sort((a, b) => b.count - a.count);
}

// リアクションコンテンツをサニタイズする関数
export function sanitizeReactionContent(content: string): string {
  // 危険な文字列を除去し、絵文字のみを許可
  return content.replace(/[<>\"'&]/g, '').slice(0, 10);
}
