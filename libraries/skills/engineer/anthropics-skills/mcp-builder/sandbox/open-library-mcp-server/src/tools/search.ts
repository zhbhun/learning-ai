/** Tools backed by the Open Library Search API (/search.json and /search/authors.json). */
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { apiRequest } from "../api.js";
import { CHARACTER_LIMIT, SEARCH_FIELDS } from "../constants.js";
import { ResponseFormat, ResponseFormatEnum } from "../format.js";

// ---- Schemas ----

const WorkDocSchema = z.object({
  key: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  author_name: z.array(z.string()).optional(),
  author_key: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
  edition_count: z.number().optional(),
  publisher: z.array(z.string()).optional(),
  first_sentence: z.array(z.string()).optional(),
  subject: z.array(z.string()).optional(),
  ratings_average: z.number().optional(),
  ratings_count: z.number().optional(),
  has_fulltext: z.boolean().optional(),
  public_scan: z.boolean().optional(),
  cover_i: z.number().optional()
});

type WorkDoc = z.infer<typeof WorkDocSchema>;

const SearchPageSchema = z.object({
  numFound: z.number(),
  docs: z.array(WorkDocSchema)
});

const AuthorDocSchema = z.object({
  key: z.string(),
  name: z.string(),
  alternate_names: z.array(z.string()).optional(),
  birth_date: z.string().optional(),
  top_work: z.string().optional(),
  work_count: z.number().optional(),
  top_subjects: z.array(z.string()).optional()
});

type AuthorDoc = z.infer<typeof AuthorDocSchema>;

const AuthorSearchPageSchema = z.object({
  numFound: z.number(),
  docs: z.array(AuthorDocSchema)
});

/** Builds the JSON Schema the Search API must receive in `fields` so docs validate. */
const fieldsParam = SEARCH_FIELDS.join(",");

// ---- Formatting ----

function coverURL(coverId: number | undefined, isbn?: string): string | undefined {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
    : isbn
      ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
      : undefined;
}

function formatWork(doc: WorkDoc): string {
  const olid = doc.key.replace("/works/", "");
  const lines = [`## ${doc.title}${doc.subtitle ? `: ${doc.subtitle}` : ""} (${olid})`];
  if (doc.author_name?.length) lines.push(`- Authors: ${doc.author_name.join(", ")}`);
  if (doc.first_publish_year) lines.push(`- First published: ${doc.first_publish_year}`);
  if (doc.edition_count !== undefined) lines.push(`- Editions: ${doc.edition_count}`);
  if (doc.ratings_average !== undefined) {
    lines.push(`- Rating: ${doc.ratings_average.toFixed(1)}/5 (${doc.ratings_count ?? 0} ratings)`);
  }
  if (doc.subject?.length) lines.push(`- Subjects: ${doc.subject.slice(0, 5).join(", ")}`);
  if (doc.public_scan || (doc.has_fulltext && doc.public_scan !== false)) {
    lines.push("- Full text available on archive.org (public scan)");
  } else if (doc.has_fulltext) {
    lines.push("- Full text searchable on archive.org (may be lendable)");
  }
  const cover = coverURL(doc.cover_i);
  if (cover) lines.push(`- Cover: ${cover}`);
  lines.push(`- Details: https://openlibrary.org${doc.key}`);
  return lines.join("\n");
}

function formatAuthor(doc: AuthorDoc): string {
  const olid = doc.key.replace("/authors/", "");
  const lines = [`## ${doc.name} (${olid})`];
  if (doc.birth_date) lines.push(`- Born: ${doc.birth_date}`);
  if (doc.top_work) lines.push(`- Top work: ${doc.top_work}`);
  if (doc.work_count !== undefined) lines.push(`- Works in Open Library: ${doc.work_count}`);
  if (doc.top_subjects?.length) lines.push(`- Top subjects: ${doc.top_subjects.slice(0, 5).join(", ")}`);
  lines.push(`- Details: https://openlibrary.org${doc.key}`);
  return lines.join("\n");
}

/** Shared renderer: builds the page object and its text in the requested format. */
function renderPage<T>(opts: {
  kind: string;
  query: string;
  docs: T[];
  numFound: number;
  offset: number;
  limit: number;
  formatOne: (doc: T) => string;
  response_format: ResponseFormat;
}): { page: Record<string, unknown>; text: string } {
  const { docs, numFound, offset, formatOne, response_format } = opts;
  const nextOffset = offset + docs.length;
  const hasMore = numFound > nextOffset;
  const page = {
    total: numFound,
    count: docs.length,
    offset,
    docs,
    has_more: hasMore,
    ...(hasMore ? { next_offset: nextOffset } : {})
  };
  if (response_format === ResponseFormat.JSON) {
    return { page, text: JSON.stringify(page, null, 2) };
  }
  const lines = [
    `# ${opts.kind} matching '${opts.query}'`,
    `Showing ${docs.length} of ${numFound}.`,
    "",
    docs.map(formatOne).join("\n\n")
  ];
  if (hasMore) lines.push("", `More results: call again with offset=${nextOffset}.`);
  return { page, text: lines.join("\n") };
}

/** Stays under CHARACTER_LIMIT by returning fewer docs; next_offset then points at the first one left out. */
function trimToLimit<T>(
  docs: T[],
  render: (docs: T[]) => { page: Record<string, unknown>; text: string }
): { docs: T[]; result: { page: Record<string, unknown>; text: string } } {
  let page = docs;
  let result = render(page);
  while (page.length > 1 && result.text.length > CHARACTER_LIMIT) {
    page = page.slice(0, Math.ceil(page.length / 2));
    result = render(page);
  }
  return { docs: page, result };
}

// ---- Registration ----

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "openlibrary_search_books",
    {
      title: "Search Books",
      description: `Search Open Library for books (works) matching a query, title, or author.

Returns one page of matching works with authors, first publish year, edition count, subjects, ratings, and availability. When more matches exist, the result says so and gives next_offset; call again with that offset for the next page.

Examples:
  - "Find books about Alan Turing" -> query="Alan Turing"
  - "Find titles named 1984" -> title="1984"
  - "Books by George Orwell" -> author="George Orwell"
Use openlibrary_get_work instead when you already have a work ID (OL…W).`,
      inputSchema: z.strictObject({
        query: z.string().max(300).optional().describe("Free-text query, e.g. 'Alan Turing computing'"),
        title: z.string().max(300).optional().describe("Match against book titles only"),
        author: z.string().max(300).optional().describe("Match against author names, e.g. 'George Orwell'"),
        subject: z.string().max(200).optional().describe("Match against subjects, e.g. 'science fiction'"),
        sort: z
          .enum(["relevance", "new", "old", "rating", "editions"])
          .default("relevance")
          .describe("Result order: relevance (default), new, old, rating, or edition count"),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of works to return"),
        offset: z.number().int().min(0).default(0).describe("Number of matches to skip, for pagination"),
        response_format: ResponseFormatEnum.default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable text, 'json' for structured data")
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ query, title, author, subject, sort, limit, offset, response_format }, ctx) => {
      if (!query && !title && !author && !subject) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No search criteria given. Provide at least one of query, title, author, or subject."
            }
          ]
        };
      }

      const params: Record<string, string | number | undefined> = {
        q: query,
        title,
        author,
        subject,
        sort: sort === "relevance" ? undefined : sort,
        limit,
        offset,
        fields: fieldsParam
      };
      const raw = await apiRequest<unknown>("/search.json", params, ctx.mcpReq.signal);
      const data = SearchPageSchema.parse(raw);

      const render = (docs: WorkDoc[]) =>
        renderPage({
          kind: "Books",
          query: query ?? title ?? author ?? subject ?? "",
          docs,
          numFound: data.numFound,
          offset,
          limit,
          formatOne: formatWork,
          response_format
        });

      const { docs, result } = trimToLimit(data.docs, render);

      if (response_format === ResponseFormat.JSON) {
        return { content: [{ type: "text", text: result.text }], structuredContent: result.page };
      }
      if (docs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No books match '${query ?? title ?? author ?? subject}'. Try shorter or different terms, or search a different field.`
            }
          ]
        };
      }
      return { content: [{ type: "text", text: result.text }] };
    }
  );

  server.registerTool(
    "openlibrary_search_authors",
    {
      title: "Search Authors",
      description: `Search Open Library for authors by name.

Returns one page of matching authors with birth date, top work, work count, and subjects. When more matches exist, the result says so and gives next_offset; call again with that offset for the next page.

Examples:
  - "Find the author of Dune" -> query="Frank Herbert"
  - "Look up Ursula K. Le Guin" -> query="Ursula Le Guin"
Use openlibrary_get_author instead when you already have an author ID (OL…A).`,
      inputSchema: z.strictObject({
        query: z.string().min(2).max(300).describe("Author name to search for, e.g. 'Isaac Asimov'"),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of authors to return"),
        offset: z.number().int().min(0).default(0).describe("Number of matches to skip, for pagination"),
        response_format: ResponseFormatEnum.default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable text, 'json' for structured data")
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ query, limit, offset, response_format }, ctx) => {
      const raw = await apiRequest<unknown>(
        "/search/authors.json",
        { q: query, limit, offset },
        ctx.mcpReq.signal
      );
      const data = AuthorSearchPageSchema.parse(raw);

      const render = (docs: AuthorDoc[]) =>
        renderPage({
          kind: "Authors",
          query,
          docs,
          numFound: data.numFound,
          offset,
          limit,
          formatOne: formatAuthor,
          response_format
        });

      const { docs, result } = trimToLimit(data.docs, render);

      if (response_format === ResponseFormat.JSON) {
        return { content: [{ type: "text", text: result.text }], structuredContent: result.page };
      }
      if (docs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No authors match '${query}'. Try a shorter name or an alternate spelling.`
            }
          ]
        };
      }
      return { content: [{ type: "text", text: result.text }] };
    }
  );
}
