import type { Tag } from "../types";

export interface ClassificationRule {
  id: string;
  name: string;
  tag: Tag;
  priority: number;
  conditions: {
    appName?: string[];
    bundleId?: string[];
    windowTitleContains?: string[];
    urlContains?: string[];
    urlDomain?: string[];
  };
}

export interface ClassificationResult {
  tag: Tag;
  confidence: number;
  matchedRule?: string;
}

// Default classification rules
export const DEFAULT_RULES: ClassificationRule[] = [
  // Development
  {
    id: "dev-vscode",
    name: "VSCode Development",
    tag: "Development",
    priority: 10,
    conditions: {
      appName: ["Visual Studio Code", "Code", "VSCode"],
      bundleId: ["com.microsoft.VSCode"],
    },
  },
  {
    id: "dev-github",
    name: "GitHub Development",
    tag: "Development",
    priority: 9,
    conditions: {
      urlDomain: ["github.com", "gitlab.com", "bitbucket.org"],
    },
  },
  {
    id: "dev-terminal",
    name: "Terminal Development",
    tag: "Development",
    priority: 8,
    conditions: {
      appName: ["Terminal", "iTerm", "iTerm2", "Warp"],
      bundleId: ["com.apple.Terminal", "com.googlecode.iterm2", "dev.warp.Warp-Stable"],
    },
  },
  {
    id: "dev-xcode",
    name: "Xcode Development",
    tag: "Development",
    priority: 10,
    conditions: {
      appName: ["Xcode"],
      bundleId: ["com.apple.dt.Xcode"],
    },
  },

  // Research & Learning
  {
    id: "research-docs",
    name: "Documentation Sites",
    tag: "Research & Learning",
    priority: 9,
    conditions: {
      urlDomain: [
        "stackoverflow.com",
        "developer.mozilla.org",
        "docs.python.org",
        "reactjs.org",
        "nodejs.org",
        "rust-lang.org",
      ],
    },
  },
  {
    id: "research-learning",
    name: "Learning Platforms",
    tag: "Research & Learning",
    priority: 10,
    conditions: {
      urlDomain: ["coursera.org", "udemy.com", "youtube.com", "medium.com", "dev.to"],
    },
  },

  // Communication
  {
    id: "comm-slack",
    name: "Slack Communication",
    tag: "Communication",
    priority: 10,
    conditions: {
      appName: ["Slack"],
      bundleId: ["com.tinyspeck.slackmacgap"],
      urlDomain: ["slack.com"],
    },
  },
  {
    id: "comm-mail",
    name: "Email",
    tag: "Communication",
    priority: 10,
    conditions: {
      appName: ["Mail", "Outlook", "Thunderbird"],
      bundleId: ["com.apple.mail", "com.microsoft.Outlook"],
      urlDomain: ["mail.google.com", "outlook.com"],
    },
  },
  {
    id: "comm-discord",
    name: "Discord",
    tag: "Communication",
    priority: 10,
    conditions: {
      appName: ["Discord"],
      bundleId: ["com.hnc.Discord"],
      urlDomain: ["discord.com"],
    },
  },

  // Meeting
  {
    id: "meeting-zoom",
    name: "Zoom Meeting",
    tag: "Meeting",
    priority: 10,
    conditions: {
      appName: ["zoom.us", "Zoom"],
      bundleId: ["us.zoom.xos"],
    },
  },
  {
    id: "meeting-meet",
    name: "Google Meet",
    tag: "Meeting",
    priority: 10,
    conditions: {
      urlDomain: ["meet.google.com"],
    },
  },
  {
    id: "meeting-teams",
    name: "Microsoft Teams",
    tag: "Meeting",
    priority: 10,
    conditions: {
      appName: ["Microsoft Teams"],
      bundleId: ["com.microsoft.teams"],
    },
  },

  // Break & Entertainment
  {
    id: "break-youtube",
    name: "YouTube Entertainment",
    tag: "Break & Entertainment",
    priority: 8,
    conditions: {
      urlDomain: ["youtube.com"],
      urlContains: ["watch?v="],
    },
  },
  {
    id: "break-social",
    name: "Social Media",
    tag: "Break & Entertainment",
    priority: 9,
    conditions: {
      urlDomain: ["twitter.com", "x.com", "facebook.com", "instagram.com", "reddit.com"],
    },
  },
  {
    id: "break-music",
    name: "Music & Podcasts",
    tag: "Break & Entertainment",
    priority: 8,
    conditions: {
      appName: ["Music", "Spotify", "Apple Music"],
      bundleId: ["com.apple.Music", "com.spotify.client"],
      urlDomain: ["spotify.com", "music.apple.com"],
    },
  },

  // Documentation
  {
    id: "doc-notion",
    name: "Notion Documentation",
    tag: "Documentation",
    priority: 10,
    conditions: {
      appName: ["Notion"],
      bundleId: ["notion.id"],
      urlDomain: ["notion.so"],
    },
  },
  {
    id: "doc-confluence",
    name: "Confluence",
    tag: "Documentation",
    priority: 10,
    conditions: {
      urlDomain: ["atlassian.net"],
      urlContains: ["confluence"],
    },
  },
  {
    id: "doc-google-docs",
    name: "Google Docs",
    tag: "Documentation",
    priority: 9,
    conditions: {
      urlDomain: ["docs.google.com"],
    },
  },

  // Review
  {
    id: "review-jira",
    name: "Jira Review",
    tag: "Review",
    priority: 10,
    conditions: {
      urlDomain: ["atlassian.net"],
      urlContains: ["jira"],
    },
  },
  {
    id: "review-linear",
    name: "Linear",
    tag: "Review",
    priority: 10,
    conditions: {
      urlDomain: ["linear.app"],
    },
  },
  {
    id: "review-pr",
    name: "Pull Request Review",
    tag: "Review",
    priority: 10,
    conditions: {
      urlContains: ["/pull/", "/merge_requests/"],
    },
  },
];

/**
 * Classify an activity based on rules
 */
export function classifyActivity(
  app: string,
  bundleId?: string,
  windowTitle?: string,
  url?: string,
  customRules: ClassificationRule[] = []
): ClassificationResult | null {
  const allRules = [...customRules, ...DEFAULT_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of allRules) {
    if (matchesRule(rule, app, bundleId, windowTitle, url)) {
      return {
        tag: rule.tag,
        confidence: calculateConfidence(rule, app, bundleId, windowTitle, url),
        matchedRule: rule.name,
      };
    }
  }

  return null;
}

/**
 * Check if activity matches a rule
 */
function matchesRule(
  rule: ClassificationRule,
  app: string,
  bundleId?: string,
  windowTitle?: string,
  url?: string
): boolean {
  const conditions = rule.conditions;

  // Check app name
  if (conditions.appName) {
    const matched = conditions.appName.some((name) => app.toLowerCase().includes(name.toLowerCase()));
    if (matched) return true;
  }

  // Check bundle ID
  if (conditions.bundleId && bundleId) {
    const matched = conditions.bundleId.some((id) => bundleId.toLowerCase() === id.toLowerCase());
    if (matched) return true;
  }

  // Check window title
  if (conditions.windowTitleContains && windowTitle) {
    const matched = conditions.windowTitleContains.some((keyword) =>
      windowTitle.toLowerCase().includes(keyword.toLowerCase())
    );
    if (matched) return true;
  }

  // Check URL contains
  if (conditions.urlContains && url) {
    const matched = conditions.urlContains.some((keyword) => url.toLowerCase().includes(keyword.toLowerCase()));
    if (matched) return true;
  }

  // Check URL domain
  if (conditions.urlDomain && url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const matched = conditions.urlDomain.some((d) => domain.includes(d.toLowerCase()));
      if (matched) return true;
    } catch {
      // Invalid URL, skip domain check
    }
  }

  return false;
}

/**
 * Calculate confidence score based on how many conditions matched
 */
function calculateConfidence(
  rule: ClassificationRule,
  app: string,
  bundleId?: string,
  windowTitle?: string,
  url?: string
): number {
  let matchCount = 0;
  let totalConditions = 0;

  const conditions = rule.conditions;

  if (conditions.appName) {
    totalConditions++;
    if (conditions.appName.some((name) => app.toLowerCase().includes(name.toLowerCase()))) {
      matchCount++;
    }
  }

  if (conditions.bundleId && bundleId) {
    totalConditions++;
    if (conditions.bundleId.some((id) => bundleId.toLowerCase() === id.toLowerCase())) {
      matchCount++;
    }
  }

  if (conditions.windowTitleContains && windowTitle) {
    totalConditions++;
    if (conditions.windowTitleContains.some((kw) => windowTitle.toLowerCase().includes(kw.toLowerCase()))) {
      matchCount++;
    }
  }

  if (conditions.urlContains && url) {
    totalConditions++;
    if (conditions.urlContains.some((kw) => url.toLowerCase().includes(kw.toLowerCase()))) {
      matchCount++;
    }
  }

  if (conditions.urlDomain && url) {
    totalConditions++;
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      if (conditions.urlDomain.some((d) => domain.includes(d.toLowerCase()))) {
        matchCount++;
      }
    } catch {
      // Invalid URL
    }
  }

  if (totalConditions === 0) return 0.5;
  return matchCount / totalConditions;
}
