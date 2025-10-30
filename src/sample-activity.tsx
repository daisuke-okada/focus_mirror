import { showHUD, popToRoot } from "@raycast/api";
import { nanoid } from "nanoid";
import { getFrontmostApp, getBrowserActiveTab } from "./utils/applescript";
import { eventRepository } from "./data/events";
import { sessionRepository } from "./data/storage";
import type { EventSample } from "./types";

export default async function SampleActivityCommand() {
  try {
    // Get the frontmost application
    const frontmostApp = await getFrontmostApp();

    // Get browser tab if it's a browser
    const browserTab = await getBrowserActiveTab(frontmostApp.name);

    // Get the current active session
    const activeSessions = await sessionRepository.getActiveSessions();
    const currentSessionId = activeSessions.length > 0 ? activeSessions[0].id : undefined;

    // Create event sample
    const now = Date.now();
    const event: EventSample = {
      id: nanoid(),
      tsStart: now,
      tsEnd: now,
      app: frontmostApp.name,
      bundleId: frontmostApp.bundleId,
      windowTitle: frontmostApp.windowTitle,
      url: browserTab.url,
      sessionId: currentSessionId,
    };

    // Store the event
    await eventRepository.create(event);

    // Build HUD message
    let message = `📸 ${frontmostApp.name}`;
    if (frontmostApp.windowTitle) {
      message += ` - ${frontmostApp.windowTitle}`;
    }
    if (browserTab.url) {
      message += ` (${browserTab.url})`;
    }

    await showHUD(message);
    await popToRoot();
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
