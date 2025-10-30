import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { sessionRepository } from "./data/storage";
import type { Session } from "./types";

export default function ShowSessionsCommand() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const allSessions = await sessionRepository.getAll();
      setSessions(allSessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSession(id: string) {
    await sessionRepository.delete(id);
    await loadSessions(); // Reload
  }

  function formatDuration(startedAt: number, endedAt?: number): string {
    const end = endedAt ?? Date.now();
    const durationMs = end - startedAt;
    const minutes = Math.floor(durationMs / 60000);
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <List isLoading={isLoading}>
      {sessions.length === 0 ? (
        <List.EmptyView title="No sessions yet" description="Start your first focus session!" />
      ) : (
        sessions.map((session) => {
          const isActive = !session.endedAt;
          const accessories = [
            { text: formatDuration(session.startedAt, session.endedAt) },
            {
              tag: {
                value: isActive ? "Active" : "Completed",
                color: isActive ? Color.Green : Color.Blue,
              },
            },
          ];

          return (
            <List.Item
              key={session.id}
              title={session.tagDeclared}
              subtitle={formatDate(session.startedAt)}
              accessories={accessories}
              icon={isActive ? { source: Icon.Circle, tintColor: Color.Green } : Icon.CheckCircle}
              actions={
                <ActionPanel>
                  <Action
                    title="Delete Session"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteSession(session.id)}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadSessions} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
