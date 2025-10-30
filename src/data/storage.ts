import { LocalStorage } from "@raycast/api";
import type { Session } from "../types";

// Key prefixes for different data types
const SESSION_PREFIX = "session_";

// Session repository using LocalStorage
export const sessionRepository = {
  async create(session: Session): Promise<void> {
    const key = `${SESSION_PREFIX}${session.id}`;
    await LocalStorage.setItem(key, JSON.stringify(session));
  },

  async getById(id: string): Promise<Session | null> {
    const key = `${SESSION_PREFIX}${id}`;
    const data = await LocalStorage.getItem<string>(key);
    return data ? JSON.parse(data) : null;
  },

  async getActiveSessions(): Promise<Session[]> {
    const allItems = await LocalStorage.allItems();
    const sessions: Session[] = [];

    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith(SESSION_PREFIX)) {
        const session = JSON.parse(value) as Session;
        if (!session.endedAt) {
          sessions.push(session);
        }
      }
    }

    // Sort by started_at descending
    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  },

  async getAll(): Promise<Session[]> {
    const allItems = await LocalStorage.allItems();
    const sessions: Session[] = [];

    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith(SESSION_PREFIX)) {
        sessions.push(JSON.parse(value) as Session);
      }
    }

    // Sort by started_at descending
    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  },

  async endSession(id: string, endedAt: number): Promise<void> {
    const session = await this.getById(id);
    if (session) {
      session.endedAt = endedAt;
      await this.create(session); // Update
    }
  },

  async delete(id: string): Promise<void> {
    const key = `${SESSION_PREFIX}${id}`;
    await LocalStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    const allItems = await LocalStorage.allItems();
    for (const key of Object.keys(allItems)) {
      if (key.startsWith(SESSION_PREFIX)) {
        await LocalStorage.removeItem(key);
      }
    }
  },
};
