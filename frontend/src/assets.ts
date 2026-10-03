import type { Emotion } from "./types";

export type EmojiAsset = { id: string; label: string; emotion: Emotion; emoji: string; defaultScale: number };

export const assets: EmojiAsset[] = [
  { id: "happy-01", label: "开心脸", emotion: "happy", emoji: "😂", defaultScale: 1.2 },
  { id: "happy-02", label: "笑脸", emotion: "happy", emoji: "😄", defaultScale: 1.2 },
  { id: "happy-03", label: "爱心眼", emotion: "happy", emoji: "😍", defaultScale: 1.2 },
  { id: "happy-04", label: "派对脸", emotion: "happy", emoji: "🥳", defaultScale: 1.2 },
  { id: "happy-05", label: "眨眼脸", emotion: "happy", emoji: "😉", defaultScale: 1.2 },
  { id: "sad-01", label: "悲伤脸", emotion: "sad", emoji: "😢", defaultScale: 1.2 },
  { id: "sad-02", label: "大哭脸", emotion: "sad", emoji: "😭", defaultScale: 1.2 },
  { id: "angry-01", label: "生气脸", emotion: "angry", emoji: "😡", defaultScale: 1.2 },
  { id: "angry-02", label: "怒火脸", emotion: "angry", emoji: "🤬", defaultScale: 1.2 },
  { id: "surprise-01", label: "惊讶脸", emotion: "surprise", emoji: "😮", defaultScale: 1.2 },
  { id: "surprise-02", label: "震惊脸", emotion: "surprise", emoji: "😱", defaultScale: 1.2 },
  { id: "neutral-01", label: "中性脸", emotion: "neutral", emoji: "🙂", defaultScale: 1.2 },
  { id: "neutral-02", label: "酷脸", emotion: "neutral", emoji: "😎", defaultScale: 1.2 },
  { id: "neutral-03", label: "思考脸", emotion: "neutral", emoji: "🤔", defaultScale: 1.2 },
  { id: "neutral-04", label: "爱心", emotion: "neutral", emoji: "❤️", defaultScale: 1.1 },
  { id: "neutral-05", label: "火焰", emotion: "neutral", emoji: "🔥", defaultScale: 1.1 },
];

export const recommendedAsset = (emotion: Emotion) => assets.find((asset) => asset.emotion === emotion) ?? assets[4];
