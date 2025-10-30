import { Action, ActionPanel, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { eventRepository } from "./data/events";
import { batchClassifyEvents } from "./utils/ai-classifier";
import type { EventSample, Tag } from "./types";

export default function ClassifyEventsCommand() {
  const [events, setEvents] = useState<EventSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClassifying, setIsClassifying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadUnclassifiedEvents();
  }, []);

  async function loadUnclassifiedEvents() {
    try {
      const allEvents = await eventRepository.getAll();
      // Find events that don't have AI classification yet
      const unclassified = allEvents.filter((e) => !e.tagAI);
      setEvents(unclassified);
    } catch (error) {
      console.error("Failed to load events:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load events",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function classifyAllEvents() {
    if (events.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "No events to classify",
      });
      return;
    }

    setIsClassifying(true);
    setProgress({ current: 0, total: events.length });

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Classifying events with AI...",
        message: `0 / ${events.length}`,
      });

      // Batch classify
      const results = await batchClassifyEvents(
        events.map((e) => ({
          app: e.app,
          bundleId: e.bundleId,
          windowTitle: e.windowTitle,
          url: e.url,
        })),
        (current, total) => {
          setProgress({ current, total });
          showToast({
            style: Toast.Style.Animated,
            title: "Classifying events with AI...",
            message: `${current} / ${total}`,
          });
        }
      );

      // Update events with AI classification
      let successCount = 0;
      for (let i = 0; i < events.length; i++) {
        const result = results.get(i);
        if (result) {
          const event = events[i];
          event.tagAI = result.tag;
          event.confidenceAI = result.confidence;
          event.tagFinal = result.tag; // AI overrides tagFinal
          await eventRepository.update(event);
          successCount++;
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Classification complete",
        message: `${successCount} events classified`,
      });

      // Reload to show updated list
      await loadUnclassifiedEvents();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Classification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsClassifying(false);
    }
  }

  async function classifySelectedEvent(event: EventSample) {
    setIsClassifying(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Classifying with AI...",
      });

      const results = await batchClassifyEvents([
        {
          app: event.app,
          bundleId: event.bundleId,
          windowTitle: event.windowTitle,
          url: event.url,
        },
      ]);

      const result = results.get(0);
      if (result) {
        event.tagAI = result.tag;
        event.confidenceAI = result.confidence;
        event.tagFinal = result.tag;
        await eventRepository.update(event);

        await showToast({
          style: Toast.Style.Success,
          title: "Classified",
          message: `Tagged as: ${result.tag}`,
        });

        await loadUnclassifiedEvents();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Classification failed",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Classification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsClassifying(false);
    }
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const subtitle = isClassifying
    ? `Classifying... ${progress.current} / ${progress.total}`
    : `${events.length} events to classify`;

  return (
    <List isLoading={isLoading || isClassifying} searchBarPlaceholder="Search unclassified events">
      {events.length === 0 ? (
        <List.EmptyView
          title="All events classified!"
          description="No unclassified events found. Great job!"
          icon={{ source: Icon.Check, tintColor: Color.Green }}
        />
      ) : (
        <>
          <List.Section title="Unclassified Events" subtitle={subtitle}>
            {events.map((event) => {
              let title = event.app;
              if (event.windowTitle) {
                title += ` - ${event.windowTitle}`;
              }
              if (event.url) {
                const urlShort = event.url.length > 40 ? event.url.substring(0, 40) + "..." : event.url;
                title += ` (${urlShort})`;
              }

              const accessories: List.Item.Accessory[] = [{ text: formatTimestamp(event.tsStart) }];

              if (event.tagRule) {
                accessories.push({
                  tag: {
                    value: `Rule: ${event.tagRule}`,
                    color: getTagColor(event.tagRule),
                  },
                });
              }

              return (
                <List.Item
                  key={event.id}
                  title={title}
                  subtitle={event.app}
                  accessories={accessories}
                  icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Classify This Event"
                        icon={Icon.Stars}
                        onAction={() => classifySelectedEvent(event)}
                      />
                      <Action title="Classify All Events" icon={Icon.Wand} onAction={classifyAllEvents} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
