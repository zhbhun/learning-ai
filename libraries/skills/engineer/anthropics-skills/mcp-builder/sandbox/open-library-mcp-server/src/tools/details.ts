/** Tools backed by the Open Library Books, Works, and Authors detail APIs. */
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { apiRequest, isOLID } from "../api.js";
import { asText, cleanText, ResponseFormat, ResponseFormatEnum } from "../format.js";

// ---- Schemas ----

const AuthorRefSchema = z.object({
  key: z.string().describe("Author key, e.g. /authors/OL18319A")
});

type AuthorRef = z.infer<typeof AuthorRefSchema>;

const EditionSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  publishers: z.array(z.string()).optional(),
  publish_date: z.string().optional(),
  isbn_10: z.array(z.string()).optional(),
  isbn_13: z.array(z.string()).optional(),
  ocaid: z.string().optional(),
  covers: z.array(z.number()).optional(),
  number_of_pages: z.number().optional(),
  languages: z.array(z.object({ key: z.string() })).optional()
});

type Edition = z.infer<typeof EditionSchema>;

const WorkSchema = z.object({
  key: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  authors: z
    .array(
      z.object({
        author: AuthorRefSchema.optional(),
        key: z.string().optional()
      })
    )
    .optional(),
  description: z.unknown().optional(),
  subjects: z.array(z.string()).optional(),
  subject_people: z.array(z.string()).optional(),
  subject_places: z.array(z.string()).optional(),
  subject_times: z.array(z.string()).optional(),
  first_publish_date: z.string().optional(),
  excerpts: z.array(z.object({ text: z.string() })).optional(),
  links: z.array(z.object({ title: z.string().optional(), url: z.string() })).optional(),
  covers: z.array(z.number()).optional(),
  edition_count: z.number().optional()
});

type Work = z.infer<typeof WorkSchema>;

const AuthorSchema = z.object({
  key: z.string(),
  name: z.string(),
  personal_name: z.string().optional(),
  birth_date: z.string().optional(),
  death_date: z.string().optional(),
  bio: z.unknown().optional(),
  top_subjects: z.array(z.string()).optional(),
  work_count: z.number().optional(),
  links: z.array(z.object({ title: z.string().optional(), url: z.string() })).optional(),
  photos: z.array(z.number()).optional()
});

type Author = z.infer<typeof AuthorSchema>;

const WorkOutputSchema = WorkSchema.extend({
  description: z.string().optional(),
  authors: z
    .array(z.object({ key: z.string() }))
    .optional()
    .describe("Author keys, e.g. /authors/OL18319A"),
  editions: z
    .object({
      entries: z.array(EditionSchema)
    })
    .optional()
});

const AuthorOutputSchema = AuthorSchema.extend({
  bio: z.string().optional(),
  photo_url: z.string().optional()
});

type WorkOutput = z.infer<typeof WorkOutputSchema>;
type AuthorOutput = z.infer<typeof AuthorOutputSchema>;

// ---- Formatting ----

/** Normalizes both author ref shapes: {author: {key}} on works, {key} elsewhere. */
function authorKey(ref: { author?: AuthorRef; key?: string }): string | undefined {
  return ref.author?.key ?? ref.key;
}

function formatWork(work: WorkOutput): string {
  const olid = work.key.replace("/works/", "");
  const lines = [`# ${work.title}${work.subtitle ? `: ${work.subtitle}` : ""}`, `Work key: ${work.key} (OLID ${olid})`];

  const description = cleanText(asText(work.description));
  if (description) lines.push("", description);

  if (work.first_publish_date) lines.push("", `First published: ${work.first_publish_date}`);
  if (work.authors?.length) {
    const keys = work.authors.map(authorKey).filter((key): key is string => Boolean(key));
    lines.push(
      `Authors: ${keys.map((key) => `[${key.replace("/authors/", "")}](https://openlibrary.org/authors/${key.replace("/authors/", "")})`).join(", ")}`
    );
  }
  if (work.subjects?.length) lines.push(`Subjects: ${work.subjects.slice(0, 15).join("; ")}`);
  if (work.subject_people?.length) lines.push(`People: ${work.subject_people.slice(0, 8).join("; ")}`);
  if (work.subject_places?.length) lines.push(`Places: ${work.subject_places.slice(0, 8).join("; ")}`);
  if (work.subject_times?.length) lines.push(`Times: ${work.subject_times.slice(0, 8).join("; ")}`);

  if (work.excerpts?.length) {
    const excerpt = cleanText(work.excerpts[0].text, 400);
    if (excerpt) lines.push("", `> Excerpt: ${excerpt}`);
  }
  if (work.links?.length) {
    lines.push("", "Links:", ...work.links.slice(0, 5).map((l) => `- ${l.title ?? "Link"}: ${l.url}`));
  }
  const coverId = work.covers?.find((id) => id > 0);
  if (coverId) lines.push(`Cover: https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);

  if (work.editions?.entries?.length) {
    lines.push("", `## Editions (${work.editions.entries.length})`, "");
    lines.push(
      work.editions.entries
        .map((edition) => {
          const parts: string[] = [];
          if (edition.title) parts.push(edition.title);
          if (edition.publish_date) parts.push(`(${edition.publish_date})`);
          if (edition.publishers?.length) parts.push(`- ${edition.publishers.join("/")}`);
          const isbns = [...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])];
          if (isbns.length) parts.push(`ISBN: ${isbns.slice(0, 2).join(", ")}`);
          if (edition.number_of_pages) parts.push(`${edition.number_of_pages} pages`);
          if (edition.ocaid) {
            parts.push(`Full text: https://archive.org/details/${edition.ocaid}`);
          }
          return `- ${parts.join(" ")}`;
        })
        .join("\n")
    );
  }
  lines.push("", `More: https://openlibrary.org${work.key}`);
  return lines.join("\n");
}

function formatAuthor(author: AuthorOutput): string {
  const olid = author.key.replace("/authors/", "");
  const lines = [`# ${author.name}`, `Author key: ${author.key} (OLID ${olid})`];

  const bio = cleanText(asText(author.bio));
  if (bio) lines.push("", bio);

  if (author.birth_date) lines.push("", `Born: ${author.birth_date}`);
  if (author.death_date) lines.push(`Died: ${author.death_date}`);
  if (author.work_count !== undefined) lines.push(`Works in Open Library: ${author.work_count}`);
  if (author.top_subjects?.length) lines.push(`Top subjects: ${author.top_subjects.slice(0, 10).join("; ")}`);
  if (author.photo_url) lines.push(`Photo: ${author.photo_url}`);
  if (author.links?.length) {
    lines.push("", "Links:", ...author.links.slice(0, 5).map((l) => `- ${l.title ?? "Link"}: ${l.url}`));
  }
  lines.push("", `More: https://openlibrary.org${author.key}`);
  return lines.join("\n");
}

// ---- Registration ----

export function registerDetailTools(server: McpServer): void {
  server.registerTool(
    "openlibrary_get_work",
    {
      title: "Get Work",
      description: `Get full details for one Open Library work (an abstract book: title, description, subjects, authors, editions) by its work ID.

Returns the work description, subject list, author links, available editions with ISBNs, and links to full text when available.

Examples:
  - "Get details for work OL1168083W" -> work_id="OL1168083W"
Use openlibrary_search_books first when you only know a title or author.`,
      inputSchema: z.strictObject({
        work_id: z
          .string()
          .describe("Work ID (OLID), e.g. 'OL1168083W'. A full key like '/works/OL1168083W' also works."),
        include_editions: z
          .boolean()
          .default(true)
          .describe("Include the work's editions with ISBNs and full-text links"),
        editions_limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe("Maximum number of editions to include when include_editions is true")
      }),
      outputSchema: WorkOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ work_id, include_editions, editions_limit }, ctx) => {
      const olid = work_id.replace(/^\/works\//, "");
      if (!isOLID(olid, "W")) {
        throw new Error(
          `'${work_id}' is not a valid work ID. Work IDs look like OL61215W; use openlibrary_search_books to find them.`
        );
      }

      const raw = await apiRequest<unknown>(`/works/${olid}.json`, {}, ctx.mcpReq.signal, { accept404: true });
      if (!raw) {
        throw new Error(
          `No work found with ID '${olid}'. Check the ID; openlibrary_search_books returns valid work keys.`
        );
      }
      const work = WorkSchema.parse(raw) as Work;
      const normalizedAuthors = work.authors
        ?.map(authorKey)
        .filter((key): key is string => Boolean(key))
        .map((key) => ({ key }));

      let editions: z.infer<typeof WorkOutputSchema>["editions"];
      if (include_editions) {
        const editionsRaw = await apiRequest<unknown>(
          `/works/${olid}/editions.json`,
          { limit: editions_limit },
          ctx.mcpReq.signal,
          { accept404: true }
        );
        if (editionsRaw && typeof editionsRaw === "object" && "entries" in editionsRaw) {
          const parsed = z.object({ entries: z.array(EditionSchema) }).parse(editionsRaw);
          editions = parsed;
        }
      }

      const output: WorkOutput = {
        ...work,
        authors: normalizedAuthors,
        description: cleanText(asText(work.description)),
        editions
      };
      return {
        content: [{ type: "text", text: formatWork(output) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "openlibrary_get_edition",
    {
      title: "Get Edition",
      description: `Get one concrete edition of a book by ISBN (10 or 13 digits) or edition ID (OL…M).

Returns title, publisher, publish date, ISBNs, page count, languages, cover, and a link to scanned full text on archive.org when available.

Examples:
  - "Look up ISBN 9780451524935" -> isbn_or_id="9780451524935"
  - "Get edition OL62592264M" -> isbn_or_id="OL62592264M"`,
      inputSchema: z.strictObject({
        isbn_or_id: z
          .string()
          .describe("ISBN-10, ISBN-13 (digits only), or edition ID (OLID) like 'OL62592264M'")
      }),
      outputSchema: EditionSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ isbn_or_id }, ctx) => {
      const id = isbn_or_id.replace(/^\/books\//, "");
      const isIsbn = /^\d{9}[\dXx]$|^\d{13}$/.test(id);
      if (!isIsbn && !isOLID(id, "M")) {
        throw new Error(
          `'${isbn_or_id}' is not a valid ISBN or edition ID. Use an ISBN (10/13 digits) or an ID like OL62592264M.`
        );
      }

      const path = isIsbn ? `/isbn/${id}.json` : `/books/${id}.json`;
      // The isbn endpoint 302-redirects to the canonical /books/OL…M.json; fetch follows redirects
      const raw = await apiRequest<unknown>(path, { jscmd: "data" }, ctx.mcpReq.signal, { accept404: true });
      if (!raw) {
        throw new Error(
          `No edition found for '${isbn_or_id}'. Check the ISBN digits, or use openlibrary_search_books to find valid editions.`
        );
      }
      const edition = EditionSchema.parse(raw);
      return {
        content: [{ type: "text", text: JSON.stringify(edition, null, 2) }],
        structuredContent: edition
      };
    }
  );

  server.registerTool(
    "openlibrary_get_author",
    {
      title: "Get Author",
      description: `Get full details for one Open Library author by ID: bio, birth/death dates, top subjects, and links.

Examples:
  - "Who is author OL18319A?" -> author_id="OL18319A"
Use openlibrary_search_authors first when you only know the author's name.`,
      inputSchema: z.strictObject({
        author_id: z
          .string()
          .describe("Author ID (OLID), e.g. 'OL18319A'. A full key like '/authors/OL18319A' also works.")
      }),
      outputSchema: AuthorOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ author_id }, ctx) => {
      const olid = author_id.replace(/^\/authors\//, "");
      if (!isOLID(olid, "A")) {
        throw new Error(
          `'${author_id}' is not a valid author ID. Author IDs look like OL18319A; use openlibrary_search_authors to find them.`
        );
      }

      const raw = await apiRequest<unknown>(`/authors/${olid}.json`, {}, ctx.mcpReq.signal, { accept404: true });
      if (!raw) {
        throw new Error(
          `No author found with ID '${olid}'. Check the ID; openlibrary_search_authors returns valid author keys.`
        );
      }
      const author = AuthorSchema.parse(raw) as Author;
      const photoId = author.photos?.find((id) => id > 0);
      const output: AuthorOutput = {
        ...author,
        bio: cleanText(asText(author.bio)),
        photo_url: photoId ? `https://covers.openlibrary.org/a/olid/${olid}-L.jpg` : undefined
      };
      return {
        content: [{ type: "text", text: formatAuthor(output) }],
        structuredContent: output
      };
    }
  );

  server.registerTool(
    "openlibrary_get_works_by_author",
    {
      title: "Get Works by Author",
      description: `List an author's works in Open Library, one page at a time, with title, first publish year, edition count, and subjects.

Examples:
  - "List books by author OL18319A" -> author_id="OL18319A"
Use openlibrary_search_authors first when you only know the author's name.`,
      inputSchema: z.strictObject({
        author_id: z
          .string()
          .describe("Author ID (OLID), e.g. 'OL18319A'. A full key like '/authors/OL18319A' also works."),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of works to return"),
        offset: z.number().int().min(0).default(0).describe("Number of works to skip, for pagination"),
        sort: z
          .enum(["relevance", "new", "old", "rating", "editions"])
          .default("old")
          .describe("Result order; 'old' (default) lists oldest first"),
        response_format: ResponseFormatEnum.default(ResponseFormat.MARKDOWN)
          .describe("'markdown' for readable text, 'json' for structured data")
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ author_id, limit, offset, sort, response_format }, ctx) => {
      const olid = author_id.replace(/^\/authors\//, "");
      if (!isOLID(olid, "A")) {
        throw new Error(
          `'${author_id}' is not a valid author ID. Author IDs look like OL18319A; use openlibrary_search_authors to find them.`
        );
      }

      const fields = "key,title,subtitle,first_publish_year,edition_count,subject,cover_i,ia,has_fulltext,public_scan";
      const raw = await apiRequest<unknown>(
        "/search.json",
        { author: `/authors/${olid}`, limit, offset, sort, fields },
        ctx.mcpReq.signal
      );
      const data = z.object({ numFound: z.number(), docs: z.array(z.record(z.string(), z.unknown())) }).parse(raw);

      const docs = data.docs.map((doc) => {
        const record = doc as Record<string, unknown>;
        const workOlid = String(record.key ?? "").replace("/works/", "");
        return {
          key: `/works/${workOlid}`,
          title: String(record.title ?? "Untitled"),
          subtitle: record.subtitle ? String(record.subtitle) : undefined,
          first_publish_year: record.first_publish_year ? Number(record.first_publish_year) : undefined,
          edition_count: record.edition_count !== undefined ? Number(record.edition_count) : undefined,
          subjects: Array.isArray(record.subject) ? record.subject.slice(0, 5).map(String) : undefined,
          detail_url: `https://openlibrary.org/works/${workOlid}`
        };
      });

      const nextOffset = offset + docs.length;
      const hasMore = data.numFound > nextOffset;
      const page = {
        total: data.numFound,
        count: docs.length,
        offset,
        docs,
        has_more: hasMore,
        ...(hasMore ? { next_offset: nextOffset } : {})
      };
      let text: string;
      if (response_format === ResponseFormat.JSON) {
        text = JSON.stringify(page, null, 2);
      } else {
        const lines = [
          `# Works by author ${olid}`,
          `Showing ${docs.length} of ${data.numFound}.`,
          "",
          docs
            .map((doc) => {
              const item = [`## ${doc.title} (${doc.key.replace("/works/", "")})`];
              if (doc.subtitle) item.push(`- Subtitle: ${doc.subtitle}`);
              if (doc.first_publish_year) item.push(`- First published: ${doc.first_publish_year}`);
              if (doc.edition_count !== undefined) item.push(`- Editions: ${doc.edition_count}`);
              if (doc.subjects?.length) item.push(`- Subjects: ${doc.subjects.join(", ")}`);
              item.push(`- Details: ${doc.detail_url}`);
              return item.join("\n");
            })
            .join("\n\n"),
          ...(hasMore ? ["", `More results: call again with offset=${nextOffset}.`] : [])
        ];
        text = lines.join("\n");
      }

      return response_format === ResponseFormat.JSON
        ? { content: [{ type: "text", text }], structuredContent: page }
        : { content: [{ type: "text", text }] };
    }
  );
}
