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
      tagRule: classification?.tag,
      confidenceRule: classification?.confidence,
      tagFinal: classification?.tag, // For now, use rule tag as final tag
      sessionId: currentSessionId,
    };

    // Store the event
    await eventRepository.create(event);

    // Build HUD message
    let message = `📸 ${frontmostApp.name}`;
    if (classification) {
      message += ` → ${classification.tag}`;
    }
    if (frontmostApp.windowTitle) {
      message += ` - ${frontmostApp.windowTitle}`;
    }
    if (browserTab.url) {
      const urlShort = browserTab.url.length > 50 ? browserTab.url.substring(0, 50) + "..." : browserTab.url;
      message += ` (${urlShort})`;
    }

    await showHUD(message);
    await popToRoot();
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
