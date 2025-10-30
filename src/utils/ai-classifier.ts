import { AI } from "@raycast/api";
import type { Tag } from "../types";
import { DEFAULT_TAGS } from "./constants";

export interface AIClassificationResult {
  tag: Tag;
  confidence: number;
  reasoning?: string;
}

/**
 * Classify an activity using Raycast AI
 * Analyzes app name, window title, and URL to infer the most appropriate tag
 */
export async function classifyActivityWithAI(
  app: string,
  bundleId?: string,
  windowTitle?: string,
  url?: string
): Promise<AIClassificationResult | null> {
  try {
    // Build context string
    const context = buildContextString(app, bundleId, windowTitle, url);

    // Build prompt
    const prompt = `You are a time tracking assistant. Analyze the following activity and classify it into ONE of these categories:

${DEFAULT_TAGS.map((tag, i) => `${i + 1}. ${tag}`).join("\n")}

Activity Information:
${context}

Instructions:
- Choose the MOST appropriate single category
- Consider the semantic meaning of window titles and URLs
- For browsers, focus on the URL content, not just "Browser"
- For coding tools, consider what's being coded based on window title
- Respond in this exact JSON format:
{
  "tag": "<one of the categories above>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation>"
}

Example:
{
  "tag": "Development",
  "confidence": 0.95,
  "reasoning": "VSCode editing TypeScript file suggests active coding work"
}`;

    // Call Raycast AI
    const response = await AI.ask(prompt, {
      model: AI.Model["Anthropic_Claude_Sonnet"],
    });

    // Parse response
    const result = parseAIResponse(response);
    return result;
  } catch (error) {
    console.error("AI classification failed:", error);
    return null;
  }
}

/**
 * Build context string from activity data
 */
function buildContextString(
  app: string,
  bundleId?: string,
  windowTitle?: string,
  url?: string
): string {
  const parts: string[] = [];

  parts.push(`Application: ${app}`);

  if (bundleId) {
    parts.push(`Bundle ID: ${bundleId}`);
  }

  if (windowTitle && windowTitle.length > 0) {
    parts.push(`Window Title: ${windowTitle}`);
  }

  if (url && url.length > 0) {
    parts.push(`URL: ${url}`);
  }

  return parts.join("\n");
}

/**
 * Parse AI response and extract classification result
 */
function parseAIResponse(response: string): AIClassificationResult | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", response);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate tag is in allowed list
    if (!DEFAULT_TAGS.includes(parsed.tag)) {
      console.error("Invalid tag from AI:", parsed.tag);
      return null;
    }

    // Validate confidence
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;

    return {
      tag: parsed.tag as Tag,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasoning: parsed.reasoning || undefined,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return null;
  }
}

/**
 * Batch classify multiple events
 */
export async function batchClassifyEvents(
  events: Array<{
    app: string;
    bundleId?: string;
    windowTitle?: string;
    url?: string;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, AIClassificationResult>> {
  const results = new Map<number, AIClassificationResult>();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const result = await classifyActivityWithAI(event.app, event.bundleId, event.windowTitle, event.url);

    if (result) {
      results.set(i, result);
    }

    if (onProgress) {
      onProgress(i + 1, events.length);
    }

    // Add small delay to avoid rate limiting
    if (i < events.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}
