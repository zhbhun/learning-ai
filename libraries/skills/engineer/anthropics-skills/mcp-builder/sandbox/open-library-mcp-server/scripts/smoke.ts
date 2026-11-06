/**
 * Self-check: starts the built server over stdio, calls its tools, and exits non-zero on any failure.
 * Run with: npm run build && npm run smoke
 */
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    // The child gets only a safe default environment; Open Library needs no API key.
    // OL_DNS_OVERRIDE + dns-fix.cjs work around DNS pollution on this network (see dns-fix.cjs);
    // harmless to keep when the network resolves Open Library normally.
    env: {
      ...getDefaultEnvironment(),
      NODE_OPTIONS: "--require ./scripts/dns-fix.cjs",
      OL_DNS_OVERRIDE: "openlibrary.org=207.241.239.14,covers.openlibrary.org=207.241.239.55"
    }
  })
);

const { tools } = await client.listTools();
assert.deepEqual(tools.map((tool) => tool.name).sort(), [
  "openlibrary_get_author",
  "openlibrary_get_edition",
  "openlibrary_get_work",
  "openlibrary_get_works_by_author",
  "openlibrary_search_authors",
  "openlibrary_search_books"
]);

// ---- search_books: JSON format, pagination fields present ----
const search = await client.callTool({
  name: "openlibrary_search_books",
  arguments: { query: "alan turing", limit: 5, response_format: "json" }
});
assert.ok(!search.isError, `search_books failed: ${JSON.stringify(search.content)}`);
const page = search.structuredContent as { docs: { key: string }[]; total: number; has_more: boolean };
assert.ok(Array.isArray(page.docs) && page.docs.length > 0, "search should return a docs array");

// ---- search_books: markdown format, character safety ----
const searchMd = await client.callTool({
  name: "openlibrary_search_books",
  arguments: { title: "1984", limit: 3 }
});
assert.ok(!searchMd.isError, `search_books markdown failed: ${JSON.stringify(searchMd.content)}`);
const mdText = (searchMd.content as { type: string; text: string }[])[0].text;
assert.ok(mdText.includes("1984"), "markdown search should mention the title");

// ---- search_books: empty criteria must be a readable tool error ----
const invalid = await client.callTool({ name: "openlibrary_search_books", arguments: { limit: 5 } });
assert.equal(invalid.isError, true, "no criteria should be rejected");
assert.ok(
  ((invalid.content as { text: string }[])[0]?.text ?? "").includes("Provide at least one"),
  "error should say how to recover"
);

// ---- search_authors, then get_author with the found OLID ----
const authors = await client.callTool({
  name: "openlibrary_search_authors",
  arguments: { query: "George Orwell", limit: 3, response_format: "json" }
});
assert.ok(!authors.isError, `search_authors failed: ${JSON.stringify(authors.content)}`);
const authorPage = authors.structuredContent as { docs: { key: string; name: string }[] };
assert.ok(authorPage.docs.length > 0, "author search should find George Orwell");
const authorOlid = authorPage.docs[0].key.replace("/authors/", "");

const author = await client.callTool({ name: "openlibrary_get_author", arguments: { author_id: authorOlid } });
assert.ok(!author.isError, `get_author failed: ${JSON.stringify(author.content)}`);
assert.ok(
  (author.structuredContent as { name: string }).name.length > 0,
  "get_author should return the author name"
);

// ---- get_work with editions, using a work from the search results ----
const workOlid = page.docs[0].key.replace("/works/", "");
const work = await client.callTool({
  name: "openlibrary_get_work",
  arguments: { work_id: workOlid, include_editions: true, editions_limit: 3 }
});
assert.ok(!work.isError, `get_work failed: ${JSON.stringify(work.content)}`);
const workOut = work.structuredContent as { key: string; title: string };
assert.equal(workOut.key, `/works/${workOlid}`, "work key should match the requested ID");

// ---- get_edition by ISBN (a stable, well-known edition) ----
const edition = await client.callTool({
  name: "openlibrary_get_edition",
  arguments: { isbn_or_id: "9780451524935" }
});
assert.ok(!edition.isError, `get_edition failed: ${JSON.stringify(edition.content)}`);
assert.equal(
  (edition.structuredContent as { title: string }).title,
  "1984",
  "ISBN 9780451524935 should resolve to 1984"
);

// ---- get_works_by_author (markdown) and its JSON format ----
const worksByAuthor = await client.callTool({
  name: "openlibrary_get_works_by_author",
  arguments: { author_id: authorOlid, limit: 5 }
});
assert.ok(!worksByAuthor.isError, `get_works_by_author failed: ${JSON.stringify(worksByAuthor.content)}`);
assert.ok(
  ((worksByAuthor.content as { text: string }[])[0]?.text ?? "").includes("Works by author"),
  "works-by-author markdown should carry its header"
);
const worksByAuthorJson = await client.callTool({
  name: "openlibrary_get_works_by_author",
  arguments: { author_id: authorOlid, limit: 5, response_format: "json" }
});
assert.ok(!worksByAuthorJson.isError, `get_works_by_author json failed: ${JSON.stringify(worksByAuthorJson.content)}`);
const worksPage = worksByAuthorJson.structuredContent as { docs: { key: string }[]; has_more: boolean };
assert.ok(Array.isArray(worksPage.docs) && worksPage.docs.length > 0, "works-by-author json should include docs");

// ---- bad identifiers must come back as readable tool errors, not crashes ----
const badWork = await client.callTool({ name: "openlibrary_get_work", arguments: { work_id: "not-a-work" } });
assert.equal(badWork.isError, true, "a malformed work ID should be rejected");
const badEdition = await client.callTool({ name: "openlibrary_get_edition", arguments: { isbn_or_id: "0" } });
assert.equal(badEdition.isError, true, "a malformed ISBN should be rejected");

await client.close();
console.error("Smoke test passed");
