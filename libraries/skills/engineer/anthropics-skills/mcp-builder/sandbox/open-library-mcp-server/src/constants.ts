/** Shared constants for the Open Library MCP server. */

export const API_BASE_URL = "https://openlibrary.org";
export const COVER_BASE_URL = "https://covers.openlibrary.org";
export const CHARACTER_LIMIT = 25_000;
export const USER_AGENT = "open-library-mcp-server/1.0.0";

/** Search API fields to request by default; keeps responses focused. */
export const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "author_key",
  "first_publish_year",
  "edition_count",
  "publisher",
  "publish_date",
  "isbn",
  "subject",
  "ratings_average",
  "ratings_count",
  "has_fulltext",
  "public_scan",
  "ia",
  "lending_edition_s",
  "cover_i"
] as const;
