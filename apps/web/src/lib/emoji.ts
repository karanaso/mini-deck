import type { MessageKey } from "@/lib/i18n/dictionaries";

export type EmojiCategory = "smileys" | "people" | "nature" | "objects";

export interface EmojiEntry {
  id: string;
  emoji: string;
  nameKey: MessageKey;
}

export interface EmojiCategoryDefinition {
  id: EmojiCategory;
  labelKey: MessageKey;
}

export const EMOJI_CATEGORIES: readonly EmojiCategoryDefinition[] = [
  { id: "smileys", labelKey: "editor.emoji.categories.smileys" },
  { id: "people", labelKey: "editor.emoji.categories.people" },
  { id: "nature", labelKey: "editor.emoji.categories.nature" },
  { id: "objects", labelKey: "editor.emoji.categories.objects" },
];

export const EMOJI_CATALOG: readonly EmojiEntry[] = [
  { id: "grin", emoji: "😀", nameKey: "editor.emoji.names.grin" },
  { id: "joy", emoji: "😂", nameKey: "editor.emoji.names.joy" },
  { id: "smile", emoji: "😊", nameKey: "editor.emoji.names.smile" },
  { id: "heartEyes", emoji: "😍", nameKey: "editor.emoji.names.heartEyes" },
  { id: "wink", emoji: "😉", nameKey: "editor.emoji.names.wink" },
  { id: "thinking", emoji: "🤔", nameKey: "editor.emoji.names.thinking" },
  { id: "party", emoji: "🥳", nameKey: "editor.emoji.names.party" },
  { id: "cool", emoji: "😎", nameKey: "editor.emoji.names.cool" },
  { id: "wave", emoji: "👋", nameKey: "editor.emoji.names.wave" },
  { id: "thumbsUp", emoji: "👍", nameKey: "editor.emoji.names.thumbsUp" },
  { id: "thumbsDown", emoji: "👎", nameKey: "editor.emoji.names.thumbsDown" },
  { id: "clap", emoji: "👏", nameKey: "editor.emoji.names.clap" },
  { id: "pray", emoji: "🙏", nameKey: "editor.emoji.names.pray" },
  { id: "muscle", emoji: "💪", nameKey: "editor.emoji.names.muscle" },
  { id: "pointRight", emoji: "👉", nameKey: "editor.emoji.names.pointRight" },
  { id: "handshake", emoji: "🤝", nameKey: "editor.emoji.names.handshake" },
  { id: "sun", emoji: "☀️", nameKey: "editor.emoji.names.sun" },
  { id: "moon", emoji: "🌙", nameKey: "editor.emoji.names.moon" },
  { id: "star", emoji: "⭐", nameKey: "editor.emoji.names.star" },
  { id: "fire", emoji: "🔥", nameKey: "editor.emoji.names.fire" },
  { id: "leaf", emoji: "🌿", nameKey: "editor.emoji.names.leaf" },
  { id: "flower", emoji: "🌸", nameKey: "editor.emoji.names.flower" },
  { id: "rainbow", emoji: "🌈", nameKey: "editor.emoji.names.rainbow" },
  { id: "turtle", emoji: "🐢", nameKey: "editor.emoji.names.turtle" },
  { id: "lightbulb", emoji: "💡", nameKey: "editor.emoji.names.lightbulb" },
  { id: "check", emoji: "✅", nameKey: "editor.emoji.names.check" },
  { id: "cross", emoji: "❌", nameKey: "editor.emoji.names.cross" },
  { id: "warning", emoji: "⚠️", nameKey: "editor.emoji.names.warning" },
  { id: "heart", emoji: "❤️", nameKey: "editor.emoji.names.heart" },
  { id: "gem", emoji: "💎", nameKey: "editor.emoji.names.gem" },
  { id: "gift", emoji: "🎁", nameKey: "editor.emoji.names.gift" },
  { id: "balloon", emoji: "🎈", nameKey: "editor.emoji.names.balloon" },
];

const CATEGORY_EMOJI_IDS: Record<EmojiCategory, readonly string[]> = {
  smileys: ["grin", "joy", "smile", "heartEyes", "wink", "thinking", "party", "cool"],
  people: ["wave", "thumbsUp", "thumbsDown", "clap", "pray", "muscle", "pointRight", "handshake"],
  nature: ["sun", "moon", "star", "fire", "leaf", "flower", "rainbow", "turtle"],
  objects: ["lightbulb", "check", "cross", "warning", "heart", "gem", "gift", "balloon"],
};

export function emojiForCategory(category: EmojiCategory): EmojiEntry[] {
  const ids = CATEGORY_EMOJI_IDS[category];
  return EMOJI_CATALOG.filter((entry) => ids.includes(entry.id));
}
