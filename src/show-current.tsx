import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { sessionRepository } from "./data/storage";
import { eventRepository } from "./data/events";
import { detectDeviation, formatTagBreakdown, getDeviationSeverity } from "./utils/deviation-detector";
import type { Session } from "./types";
import type { DeviationResult } from "./utils/deviation-detector";

export default function ShowCurrentFocusCommand() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [deviation, setDeviation] = useState<DeviationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentSession();
  }, []);

  async function loadCurrentSession() {
    try {
      const activeSessions = await sessionRepository.getActiveSessions();
      const session = activeSessions.length > 0 ? activeSessions[0] : null;
      setCurrentSession(session);

      // Load deviation info if session exists
      if (session) {
        const allEvents = await eventRepository.getAll();
        const deviationResult = detectDeviation(session, allEvents);
        setDeviation(deviationResult);
      } else {
        setDeviation(null);
      }
    } catch (error) {
      console.error("Failed to load current session:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDuration(startedAt: number): string {
    const now = Date.now();
    const durationMs = now - startedAt;
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function formatTimeRemaining(startedAt: number, durationMinutes: number): string {
    const now = Date.now();
    const endTime = startedAt + durationMinutes * 60000;
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      return "Time's up!";
    }

    const minutes = Math.floor(remainingMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!currentSession) {
    return (
      <Detail
        markdown="# No Active Focus Session\n\nStart a new focus session to track your work!"
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCurrentSession} />
          </ActionPanel>
        }
      />
    );
  }

  const elapsed = formatDuration(currentSession.startedAt);
  const remaining = formatTimeRemaining(currentSession.startedAt, currentSession.durationMinutes);
  const startedAt = formatDate(currentSession.startedAt);
  const progress = Math.min(
    100,
    ((Date.now() - currentSession.startedAt) / (currentSession.durationMinutes * 60000)) * 100
  );

  // Build deviation section
  let deviationSection = "";
  if (deviation && deviation.tagBreakdown.size > 0) {
    const severity = getDeviationSeverity(deviation);
    const severityEmoji = severity === "critical" ? "🔴" : severity === "warning" ? "🟡" : "🟢";

    deviationSection = `
### ${severityEmoji} Activity Breakdown

${formatTagBreakdown(deviation.tagBreakdown, currentSession.tagDeclared)}
`;

    if (deviation.isDeviating) {
      deviationSection += `\n---\n\n⚠️ **Deviation Detected!**\n`;
      if (deviation.continuousDeviation) {
        deviationSection += `- Continuous deviation: ${deviation.continuousDurationSeconds}s\n`;
      }
      if (deviation.percentageDeviation) {
        deviationSection += `- Off-track time: ${deviation.deviationPercent.toFixed(0)}%\n`;
      }
    }
  }

  const markdown = `
# 🎯 Current Focus

## ${currentSession.tagDeclared}

---

### ⏱️ Time
- **Elapsed**: ${elapsed}
- **Remaining**: ${remaining}
- **Progress**: ${progress.toFixed(0)}%

### 📅 Session Info
- **Started**: ${startedAt}
- **Duration**: ${currentSession.durationMinutes} minutes
- **Source**: ${currentSession.source === "manual" ? "Manual" : "Calendar"}

---
${deviationSection}
${deviationSection ? "---\n" : ""}
${progress >= 100 ? "✅ **Session complete!** Don't forget to stop the session." : "Keep focusing! 💪"}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCurrentSession} />
        </ActionPanel>
      }
    />
  );
}
