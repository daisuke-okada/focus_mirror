import { showToast, Toast, popToRoot, showHUD } from "@raycast/api";
import { sessionRepository } from "./data/storage";

export default async function StopFocusCommand() {
  try {
    // Get active sessions
    const activeSessions = await sessionRepository.getActiveSessions();

    if (activeSessions.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active session",
        message: "Start a focus session first",
      });
      return;
    }

    // End the first active session
    const session = activeSessions[0];
    const endedAt = Date.now();
    await sessionRepository.endSession(session.id, endedAt);

    // Calculate duration
    const durationMs = endedAt - session.startedAt;
    const minutes = Math.floor(durationMs / 60000);

    await showHUD(`Focus session stopped: ${session.tagDeclared} (${minutes} min)`);
    await popToRoot();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error occurred",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
