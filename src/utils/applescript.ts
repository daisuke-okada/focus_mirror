import { runAppleScript } from "@raycast/utils";

export interface FrontmostApp {
  name: string;
  bundleId?: string;
  windowTitle?: string;
}

export interface ChromeTab {
  url?: string;
  title?: string;
}

/**
 * Get the frontmost (currently active) application
 */
export async function getFrontmostApp(): Promise<FrontmostApp> {
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
      set bundleId to bundle identifier of first application process whose frontmost is true
    end tell

    tell application "System Events"
      tell process frontApp
        try
          set winTitle to name of front window
        on error
          set winTitle to ""
        end try
      end tell
    end tell

    return frontApp & "||" & bundleId & "||" & winTitle
  `;

  try {
    const result = await runAppleScript(script);
    const [name, bundleId, windowTitle] = result.split("||");
    return {
      name: name.trim(),
      bundleId: bundleId.trim(),
      windowTitle: windowTitle.trim(),
    };
  } catch (error) {
    console.error("Failed to get frontmost app:", error);
    throw error;
  }
}

/**
 * Get the active tab from Google Chrome
 */
export async function getChromeActiveTab(): Promise<ChromeTab> {
  const script = `
    tell application "Google Chrome"
      if (count of windows) = 0 then
        return "||"
      end if

      try
        set theUrl to URL of active tab of front window
        set theTitle to title of active tab of front window
        return theUrl & "||" & theTitle
      on error
        return "||"
      end try
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    const [url, title] = result.split("||");
    return {
      url: url.trim() || undefined,
      title: title.trim() || undefined,
    };
  } catch (error) {
    // Chrome might not be running or installed
    return {};
  }
}

/**
 * Get the active tab from Safari
 */
export async function getSafariActiveTab(): Promise<ChromeTab> {
  const script = `
    tell application "Safari"
      if (count of windows) = 0 then
        return "||"
      end if

      try
        set theUrl to URL of current tab of front window
        set theTitle to name of current tab of front window
        return theUrl & "||" & theTitle
      on error
        return "||"
      end try
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    const [url, title] = result.split("||");
    return {
      url: url.trim() || undefined,
      title: title.trim() || undefined,
    };
  } catch (error) {
    // Safari might not be running or installed
    return {};
  }
}

/**
 * Get browser tab based on the current browser
 */
export async function getBrowserActiveTab(appName: string): Promise<ChromeTab> {
  const lowerAppName = appName.toLowerCase();

  if (lowerAppName.includes("chrome")) {
    return getChromeActiveTab();
  } else if (lowerAppName.includes("safari")) {
    return getSafariActiveTab();
  }

  return {};
}
