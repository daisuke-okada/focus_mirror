export type Tag = string;

export type Session = {
  id: string;
  tagDeclared: Tag;
  durationMinutes: number;
  startedAt: number; // epoch ms
  endedAt?: number;
  source: "manual" | "calendar_suggested";
};

export type EventSample = {
  id: string;
  tsStart: number;
  tsEnd: number;
  app: string;
  bundleId?: string;
  windowTitle?: string;
  url?: string;
  tagRule?: Tag;
  tagAI?: Tag;
  tagFinal?: Tag;
  confidenceRule?: number;
  confidenceAI?: number;
  sessionId?: string;
};

export type Rule = {
  id: string;
  name: string;
  pattern: string; // regex or glob
  target: "bundle_id" | "window_title" | "url";
  tag: Tag;
  enabled: boolean;
};

export type DeviationWindow = {
  windowMinutes: number; // 10
  thresholdPct: number; // 20
  continuousSeconds: number; // 120
};
