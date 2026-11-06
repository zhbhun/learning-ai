/**
 * Open Library API client: one request helper shared by every tool.
 * Open Library needs no API key; we only send a descriptive User-Agent,
 * which the API asks callers to provide.
 */
import { API_BASE_URL, USER_AGENT } from "./constants.js";

/** Keeps the HTTP status so callers can tell a 404 from other failures. */
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(httpErrorMessage(status));
  }
}

// Thrown errors reach the model as the tool result's text, so say how to recover
function httpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "The Open Library API rejected the request (HTTP 400). Check the identifier format: work IDs look like OL61215W, edition IDs like OL62592264M, author IDs like OL18319A, ISBNs are 10 or 13 digits.";
    case 404:
      return "Not found in Open Library (HTTP 404). Check the identifier: search_books or search_authors returns valid keys (e.g. /works/OL61215W).";
    case 429:
      return "Rate limit exceeded on the Open Library API. Wait a minute before making more requests.";
    case 500:
    case 502:
    case 503:
      return `The Open Library API is temporarily unavailable (HTTP ${status}). Try again in a moment, or narrow the query.`;
    default:
      return `The Open Library API returned HTTP ${status}. Try again, or adjust the query.`;
  }
}

/** Normalizes an Open Library key ("/works/OL61215W") to a bare OLID ("OL61215W"). */
export function toOLID(key: string): string {
  return key.replace(/^\/(works|books|authors)\//, "");
}

/** Detects an OLID like OL458049W/M/A followed by optional digits. */
export function isOLID(value: string, kind: "W" | "M" | "A"): boolean {
  return new RegExp(`^OL\\d+${kind}$`).test(value);
}

/**
 * GETs an Open Library JSON endpoint.
 * 404 responses return HTML, so callers use `accept404` to get `null` instead of a throw.
 */
export async function apiRequest<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
  options: { accept404?: boolean } = {}
): Promise<T | null> {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      // Aborts when the client cancels the call, or after 30 seconds
      signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(30_000)])
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("The Open Library API did not respond within 30 seconds. Try again, or narrow the query.");
    }
    throw new Error(`Could not reach the Open Library API: ${error instanceof Error ? error.message : String(error)}. Check your network connection and try again.`);
  }

  if (response.status === 404 && options.accept404) return null;
  if (!response.ok) throw new ApiError(response.status);
  // A non-JSON body (the API sometimes answers errors as HTML) would fail unhelpfully below
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(response.status === 200 ? 502 : response.status);
  }
  return (await response.json()) as T;
}
