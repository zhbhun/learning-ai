# open-library-mcp-server

MCP server for the [Open Library API](https://openlibrary.org/developers/api). Open Library is a free, open catalog of books; this server needs **no API key**.

## Tools

| Tool | What it does |
|---|---|
| `openlibrary_search_books` | Search works by free-text query, title, author, or subject, with sorting and pagination |
| `openlibrary_search_authors` | Search authors by name, with birth date, top work, and work count |
| `openlibrary_get_work` | Full work details: description, subjects, authors, editions with ISBNs |
| `openlibrary_get_edition` | One concrete edition by ISBN-10/13 or edition ID (OL…M) |
| `openlibrary_get_author` | Author details: bio, birth/death, subjects, photo, links |
| `openlibrary_get_works_by_author` | Paginated list of an author's works |

All search/list tools support `response_format` (`markdown`, default; or `json` with `structuredContent`), `limit` (1–100), and `offset` pagination returning `has_more` / `next_offset`.

## Setup

```bash
npm install
npm run build
```

Requires Node.js 20.3+.

## Usage

Register with an MCP client (e.g. Claude Code):

```bash
claude mcp add open-library -- node /path/to/open-library-mcp-server/dist/index.js
```

Or with npx:

```bash
claude mcp add open-library -- npx -y open-library-mcp-server
```

Manual exploration with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Verify

```bash
npm run build && npm run smoke
```

The self-check script starts the built server over stdio, calls every tool with realistic arguments, and exits non-zero on failure.

## Notes

- Responses are capped at 25,000 characters by returning fewer items, never by truncating text mid-item.
- Identifier formats: work `OL61215W`, edition `OL62592264M`, author `OL18319A`.
- Cover images are returned as URLs (`covers.openlibrary.org`), not downloaded.
- Requests honor client cancellation and time out after 30 seconds with an actionable error.

### DNS-polluted networks

Some networks resolve `openlibrary.org` to wrong IPs. If every tool fails with "Could not reach the Open Library API", resolve the real IP (e.g. `curl 'https://1.1.1.1/dns-query?name=openlibrary.org&type=A' -H 'accept: application/dns-json'`) and point Node's DNS at it by launching the server with:

```bash
NODE_OPTIONS="--require ./scripts/dns-fix.cjs" \
OL_DNS_OVERRIDE="openlibrary.org=<real-ip>,covers.openlibrary.org=<real-ip>" \
node dist/index.js
```

`scripts/dns-fix.cjs` is used by the smoke test this way; on a clean network you can ignore or delete it.
