/** Shared helpers for rendering tool results: response-format enum and text normalization. */
import { z } from "zod/v4";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

export const ResponseFormatEnum = z.enum(ResponseFormat);

/** Open Library stores description/bio either as a string or as { type, value }; this flattens both. */
export function asText(field: unknown): string | undefined {
  if (typeof field === "string") return field;
  if (field && typeof field === "object" && "value" in field && typeof (field as { value: unknown }).value === "string") {
    return (field as { value: string }).value;
  }
  return undefined;
}

/** Strips Open Library's internal markup (e.g. {{...}} template hints) from free text. */
export function cleanText(text: string | undefined, maxLength = 1200): string | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}
