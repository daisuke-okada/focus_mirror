import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { nanoid } from "nanoid";
import { sessionRepository } from "./data/storage";
import { DEFAULT_TAGS, DURATION_OPTIONS } from "./utils/constants";
import type { Session } from "./types";

interface FormValues {
  tag: string;
  customTag?: string;
  duration: string;
}

export default function StartFocusCommand() {
  async function handleSubmit(values: FormValues) {
    try {
      // Determine which tag to use
      const tag = values.customTag && values.customTag.trim() ? values.customTag.trim() : values.tag;

      if (!tag) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please enter a tag",
        });
        return;
      }

      const durationMinutes = parseInt(values.duration, 10);

      // Check if there's already an active session
      const activeSessions = await sessionRepository.getActiveSessions();
      if (activeSessions.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Active session exists",
          message: "Please stop the current session first",
        });
        return;
      }

      // Create new session
      const session: Session = {
        id: nanoid(),
        tagDeclared: tag,
        durationMinutes,
        startedAt: Date.now(),
        source: "manual",
      };

      // Save to LocalStorage
      await sessionRepository.create(session);

      await showToast({
        style: Toast.Style.Success,
        title: "Focus Session Started",
        message: `${tag} - ${durationMinutes} min`,
      });

      // Return to Raycast
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error occurred",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Focus" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="tag" title="Focus Tag" defaultValue={DEFAULT_TAGS[0]}>
        {DEFAULT_TAGS.map((tag) => (
          <Form.Dropdown.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="customTag" title="Custom Tag (optional)" placeholder="e.g., Planning, Code Review..." />

      <Form.Dropdown id="duration" title="Duration (minutes)" defaultValue="60">
        {DURATION_OPTIONS.map((duration) => (
          <Form.Dropdown.Item key={duration} value={String(duration)} title={`${duration} min`} />
        ))}
      </Form.Dropdown>

      <Form.Description text="Starting a focus session will begin monitoring your activity." />
    </Form>
  );
}
