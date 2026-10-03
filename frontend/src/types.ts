export type Emotion = "happy" | "sad" | "angry" | "surprise" | "fear" | "disgust" | "neutral";

export type Face = {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
  emotion: Emotion;
  confidence: number;
  faceConfidence: number;
  emotionConfidence: number;
  needsReview: boolean;
};

export type PredictionResponse = {
  image: { width: number; height: number };
  faces: Face[];
  warnings: string[];
};

export type EmojiLayer = {
  faceId: string;
  assetId: string;
  visible: boolean;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  source: "recommended" | "manual" | "generated";
};
