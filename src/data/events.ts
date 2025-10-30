import { LocalStorage } from "@raycast/api";
import type { EventSample } from "../types";

// Key prefix for events
const EVENT_PREFIX = "event_";

// Event repository using LocalStorage
export const eventRepository = {
  async create(event: EventSample): Promise<void> {
    const key = `${EVENT_PREFIX}${event.id}`;
    await LocalStorage.setItem(key, JSON.stringify(event));
  },

  async getAll(): Promise<EventSample[]> {
    const allItems = await LocalStorage.allItems();
    const events: EventSample[] = [];

    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith(EVENT_PREFIX)) {
        events.push(JSON.parse(value) as EventSample);
      }
    }

    // Sort by ts_start descending
    return events.sort((a, b) => b.tsStart - a.tsStart);
  },

  async getBySessionId(sessionId: string): Promise<EventSample[]> {
    const allEvents = await this.getAll();
    return allEvents.filter((event) => event.sessionId === sessionId);
  },

  async delete(id: string): Promise<void> {
    const key = `${EVENT_PREFIX}${id}`;
    await LocalStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    const allItems = await LocalStorage.allItems();
    for (const key of Object.keys(allItems)) {
      if (key.startsWith(EVENT_PREFIX)) {
        await LocalStorage.removeItem(key);
      }
    }
  },
};
