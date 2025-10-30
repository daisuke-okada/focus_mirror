import type { Session, EventSample, Tag } from "../types";

export interface DeviationConfig {
  continuousSeconds: number; // Default: 120 (2 minutes)
  thresholdPercent: number; // Default: 20 (20%)
}

export interface DeviationResult {
  isDeviating: boolean;
  continuousDeviation: boolean; // True if continuous deviation detected
  percentageDeviation: boolean; // True if percentage threshold exceeded
  continuousDurationSeconds: number;
  sessionDurationMinutes: number;
  tagBreakdown: Map<Tag, number>; // Tag -> duration in milliseconds
  deviationPercent: number;
}

const DEFAULT_CONFIG: DeviationConfig = {
  continuousSeconds: 120, // 2 minutes
  thresholdPercent: 20, // 20%
};

/**
 * Detect if current session is deviating from declared focus
 */
export function detectDeviation(
  session: Session,
  events: EventSample[],
  config: DeviationConfig = DEFAULT_CONFIG
): DeviationResult {
  // Filter events for this session
  const sessionEvents = events
    .filter((e) => e.sessionId === session.id)
    .sort((a, b) => a.tsStart - b.tsStart); // Sort by start time

  if (sessionEvents.length === 0) {
    return {
      isDeviating: false,
      continuousDeviation: false,
      percentageDeviation: false,
      continuousDurationSeconds: 0,
      sessionDurationMinutes: 0,
      tagBreakdown: new Map(),
      deviationPercent: 0,
    };
  }

  const declaredTag = session.tagDeclared;
  const now = Date.now();
  const sessionDuration = now - session.startedAt;
  const sessionDurationMinutes = Math.floor(sessionDuration / 60000);

  // Calculate tag breakdown
  const tagBreakdown = new Map<Tag, number>();
  for (const event of sessionEvents) {
    const duration = event.tsEnd - event.tsStart;
    const tag = event.tagFinal || "Unknown";
    tagBreakdown.set(tag, (tagBreakdown.get(tag) || 0) + duration);
  }

  // Check continuous deviation (most recent events)
  const continuousDurationSeconds = checkContinuousDeviation(sessionEvents, declaredTag, now);
  const continuousDeviation = continuousDurationSeconds >= config.continuousSeconds;

  // Check percentage deviation
  const declaredDuration = tagBreakdown.get(declaredTag) || 0;
  const totalDuration = Array.from(tagBreakdown.values()).reduce((sum, d) => sum + d, 0);
  const declaredPercent = totalDuration > 0 ? (declaredDuration / totalDuration) * 100 : 100;
  const deviationPercent = 100 - declaredPercent;
  const percentageDeviation = deviationPercent >= config.thresholdPercent;

  return {
    isDeviating: continuousDeviation || percentageDeviation,
    continuousDeviation,
    percentageDeviation,
    continuousDurationSeconds,
    sessionDurationMinutes,
    tagBreakdown,
    deviationPercent,
  };
}

/**
 * Check for continuous deviation at the end of event stream
 */
function checkContinuousDeviation(events: EventSample[], declaredTag: Tag, now: number): number {
  if (events.length === 0) return 0;

  // Start from the most recent event and go backwards
  let continuousDuration = 0;
  let currentTime = now;

  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    const eventTag = event.tagFinal || "Unknown";

    // Check if this event is recent (within last 5 minutes of current time)
    if (currentTime - event.tsEnd > 5 * 60 * 1000) {
      break; // Gap too large, stop counting
    }

    // If tag matches declared, stop counting deviation
    if (eventTag === declaredTag) {
      break;
    }

    // Add this event's duration to continuous deviation
    const eventDuration = event.tsEnd - event.tsStart;
    continuousDuration += eventDuration;
    currentTime = event.tsStart; // Move backwards in time
  }

  return Math.floor(continuousDuration / 1000); // Return in seconds
}

/**
 * Format tag breakdown for display
 */
export function formatTagBreakdown(tagBreakdown: Map<Tag, number>, declaredTag: Tag): string {
  const total = Array.from(tagBreakdown.values()).reduce((sum, d) => sum + d, 0);
  if (total === 0) return "No activity recorded";

  const lines: string[] = [];
  const sortedTags = Array.from(tagBreakdown.entries()).sort((a, b) => b[1] - a[1]);

  for (const [tag, duration] of sortedTags) {
    const percent = (duration / total) * 100;
    const minutes = Math.floor(duration / 60000);
    const emoji = tag === declaredTag ? "✅" : "❌";
    lines.push(`${emoji} ${tag}: ${minutes}m (${percent.toFixed(0)}%)`);
  }

  return lines.join("\n");
}

/**
 * Get deviation severity level
 */
export function getDeviationSeverity(result: DeviationResult): "none" | "warning" | "critical" {
  if (!result.isDeviating) return "none";
  if (result.continuousDeviation && result.continuousDurationSeconds >= 300) return "critical"; // 5+ minutes
  if (result.percentageDeviation && result.deviationPercent >= 30) return "critical"; // 30%+
  return "warning";
}
