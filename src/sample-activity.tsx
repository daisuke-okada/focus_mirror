import { showHUD, popToRoot } from "@raycast/api";
import { nanoid } from "nanoid";
import { getFrontmostApp, getBrowserActiveTab } from "./utils/applescript";
import { eventRepository } from "./data/events";
import { sessionRepository } from "./data/storage";
import { classifyActivity } from "./utils/classifier";
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

    // Classify the activity using rules
    const classification = classifyActivity(
      frontmostApp.name,
      frontmostApp.bundleId,
      frontmostApp.windowTitle,
      browserTab.url
    );

    const now = Date.now();

    // Get all existing events to check for continuation
    const allEvents = await eventRepository.getAll();
    const CONTINUATION_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    // Find the most recent event
    let shouldContinue = false;
    let existingEvent: EventSample | null = null;

    if (allEvents.length > 0) {
      const latestEvent = allEvents[0]; // Already sorted by tsStart descending

      // Check if this is a continuation of the same activity
      const isSameApp = latestEvent.app === frontmostApp.name;
      const isSameUrl = latestEvent.url === browserTab.url;
      const isSameSession = latestEvent.sessionId === currentSessionId;
      const isRecent = now - latestEvent.tsEnd < CONTINUATION_THRESHOLD;

      if (isSameApp && isSameUrl && isSameSession && isRecent) {
        shouldContinue = true;
        existingEvent = latestEvent;
      }
    }

    if (shouldContinue && existingEvent) {
      // Update existing event's tsEnd
      existingEvent.tsEnd = now;
      await eventRepository.update(existingEvent);
    } else {
      // Create new event
      const event: EventSample = {
        id: nanoid(),
        tsStart: now,
        tsEnd: now,
        app: frontmostApp.name,
        bundleId: frontmostApp.bundleId,
        windowTitle: frontmostApp.windowTitle,
        url: browserTab.url,
        tagRule: classification?.tag,
        confidenceRule: classification?.confidence,
        tagFinal: classification?.tag, // For now, use rule tag as final tag
        sessionId: currentSessionId,
      };

      // Store the event
      await eventRepository.create(event);
    }

    // Build HUD message
    let message = shouldContinue ? `⏱️ Continued: ${frontmostApp.name}` : `📸 New: ${frontmostApp.name}`;
    if (classification) {
      message += ` → ${classification.tag}`;
    }
    if (shouldContinue && existingEvent) {
      const durationSec = Math.floor((now - existingEvent.tsStart) / 1000);
      message += ` (${durationSec}s total)`;
    }

    await showHUD(message);
    await popToRoot();
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
