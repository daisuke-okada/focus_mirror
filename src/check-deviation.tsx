import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { sessionRepository } from "./data/storage";
import { eventRepository } from "./data/events";
import { detectDeviation, formatTagBreakdown, getDeviationSeverity } from "./utils/deviation-detector";
import type { Session } from "./types";
import type { DeviationResult } from "./utils/deviation-detector";

export default function CheckDeviationCommand() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [deviation, setDeviation] = useState<DeviationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeviationInfo();
  }, []);

  async function loadDeviationInfo() {
    try {
      const activeSessions = await sessionRepository.getActiveSessions();
      const session = activeSessions.length > 0 ? activeSessions[0] : null;
      setCurrentSession(session);

      if (session) {
        const allEvents = await eventRepository.getAll();
        const deviationResult = detectDeviation(session, allEvents);
        setDeviation(deviationResult);

        // Show toast notification based on deviation status
        if (deviationResult.isDeviating) {
          const severity = getDeviationSeverity(deviationResult);
          await showToast({
            style: severity === "critical" ? Toast.Style.Failure : Toast.Style.Animated,
            title: "Deviation Detected!",
            message: `${deviationResult.deviationPercent.toFixed(0)}% off-track`,
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "On Track!",
            message: "No deviation detected",
          });
        }
      }
    } catch (error) {
      console.error("Failed to check deviation:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to check deviation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!currentSession) {
    return (
      <Detail
        markdown="# No Active Session\n\nStart a focus session to track deviation."
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadDeviationInfo} />
          </ActionPanel>
        }
      />
    );
  }

  if (!deviation || deviation.tagBreakdown.size === 0) {
    return (
      <Detail
        markdown={`# 🎯 ${currentSession.tagDeclared}

## No Activity Recorded Yet

Start working and sample your activity to see deviation analysis.

Background sampling runs every minute automatically.`}
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadDeviationInfo} />
          </ActionPanel>
        }
      />
    );
  }

  const severity = getDeviationSeverity(deviation);
  const severityEmoji = severity === "critical" ? "🔴" : severity === "warning" ? "🟡" : "🟢";
  const severityText = severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Good";

  const markdown = `
# ${severityEmoji} Deviation Report

## Session: ${currentSession.tagDeclared}

---

### Overall Status: **${severityText}**

${deviation.isDeviating ? "⚠️ **Deviation detected in this session**" : "✅ **You're staying on track!**"}

---

### Activity Breakdown

${formatTagBreakdown(deviation.tagBreakdown, currentSession.tagDeclared)}

---

### Deviation Details

- **Session Duration**: ${deviation.sessionDurationMinutes} minutes
- **Off-Track Percentage**: ${deviation.deviationPercent.toFixed(1)}%
${
  deviation.continuousDeviation
    ? `- **⚠️ Continuous Deviation**: ${deviation.continuousDurationSeconds} seconds (${Math.floor(deviation.continuousDurationSeconds / 60)}m ${deviation.continuousDurationSeconds % 60}s)`
    : ""
}
${deviation.percentageDeviation ? `- **⚠️ Threshold Exceeded**: More than 20% off-track` : ""}

---

### Thresholds

- Continuous deviation: 2 minutes (120s)
- Percentage threshold: 20%

${deviation.isDeviating ? "\n💡 **Tip**: Use 'Show Events' to review and correct tags if needed." : "\n🎉 **Great job!** Keep up the focused work!"}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadDeviationInfo} />
        </ActionPanel>
      }
    />
  );
}
