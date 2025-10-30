import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { eventRepository } from "./data/events";
import { sessionRepository } from "./data/storage";
import type { EventSample, Session, Tag } from "./types";
import { DEFAULT_TAGS } from "./utils/constants";

export default function ShowEventsCommand() {
  const [events, setEvents] = useState<EventSample[]>([]);
  const [sessions, setSessions] = useState<Map<string, Session>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<Tag | "all">("all");
  const [sessionFilter, setSessionFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const allEvents = await eventRepository.getAll();
      const allSessions = await sessionRepository.getAll();

      // Create session map for quick lookup
      const sessionMap = new Map<string, Session>();
      allSessions.forEach((session) => {
        sessionMap.set(session.id, session);
      });

      setEvents(allEvents);
      setSessions(sessionMap);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteEvent(id: string) {
    await eventRepository.delete(id);
    await loadData();
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDuration(start: number, end: number): string {
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function getTagColor(tag?: Tag): Color {
    if (!tag) return Color.SecondaryText;

    const colorMap: Record<Tag, Color> = {
      Development: Color.Blue,
      "Research & Learning": Color.Purple,
      Communication: Color.Green,
      Meeting: Color.Orange,
      "Break & Entertainment": Color.Yellow,
      Documentation: Color.Magenta,
      Review: Color.Red,
    };

    return colorMap[tag] || Color.SecondaryText;
  }

  // Apply filters
  const filteredEvents = events.filter((event) => {
    if (tagFilter !== "all" && event.tagFinal !== tagFilter) {
      return false;
    }
    if (sessionFilter !== "all" && event.sessionId !== sessionFilter) {
      return false;
    }
    return true;
  });

  // Get unique session IDs for filter
  const sessionIds = Array.from(new Set(events.map((e) => e.sessionId).filter((id) => id !== undefined)));

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <>
          <List.Dropdown
            tooltip="Filter by Tag"
            value={tagFilter}
            onChange={(newValue) => setTagFilter(newValue as Tag | "all")}
          >
            <List.Dropdown.Item title="All Tags" value="all" />
            {DEFAULT_TAGS.map((tag) => (
              <List.Dropdown.Item key={tag} title={tag} value={tag} />
            ))}
          </List.Dropdown>
          <List.Dropdown
            tooltip="Filter by Session"
            value={sessionFilter}
            onChange={(newValue) => setSessionFilter(newValue)}
          >
            <List.Dropdown.Item title="All Sessions" value="all" />
            {sessionIds.map((sessionId) => {
              if (!sessionId) return null;
              const session = sessions.get(sessionId);
              const title = session ? `${session.tagDeclared} (${formatTimestamp(session.startedAt)})` : sessionId;
              return <List.Dropdown.Item key={sessionId} title={title} value={sessionId} />;
            })}
          </List.Dropdown>
        </>
      }
    >
      {filteredEvents.length === 0 ? (
        <List.EmptyView
          title="No events found"
          description="Try adjusting filters or capture your first activity sample"
        />
      ) : (
        filteredEvents.map((event) => {
          const session = event.sessionId ? sessions.get(event.sessionId) : undefined;
          const duration = formatDuration(event.tsStart, event.tsEnd);

          const accessories: List.Item.Accessory[] = [{ text: duration }];

          if (event.tagFinal) {
            accessories.push({
              tag: {
                value: event.tagFinal,
                color: getTagColor(event.tagFinal),
              },
            });
          }

          if (event.confidenceRule !== undefined) {
            accessories.push({
              text: `${Math.round(event.confidenceRule * 100)}%`,
              tooltip: "Classification Confidence",
            });
          }

          let subtitle = formatTimestamp(event.tsStart);
          if (session) {
            subtitle += ` • Session: ${session.tagDeclared}`;
          }

          let title = event.app;
          if (event.windowTitle) {
            title += ` - ${event.windowTitle}`;
          }
          if (event.url) {
            const urlShort = event.url.length > 60 ? event.url.substring(0, 60) + "..." : event.url;
            title += ` (${urlShort})`;
          }

          return (
            <List.Item
              key={event.id}
              title={title}
              subtitle={subtitle}
              accessories={accessories}
              icon={{ source: Icon.Eye, tintColor: event.tagFinal ? getTagColor(event.tagFinal) : Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action title="Delete Event" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => deleteEvent(event.id)} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadData} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
