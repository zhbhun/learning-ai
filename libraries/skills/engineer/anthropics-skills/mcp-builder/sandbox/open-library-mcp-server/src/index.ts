#!/usr/bin/env node
/**
 * MCP server for the Open Library API (https://openlibrary.org/developers/api).
 * No API key required. Serves stdio.
 */
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerDetailTools } from "./tools/details.js";
import { registerSearchTools } from "./tools/search.js";

/** Builds a fresh server with every tool registered; the transport entry point calls this. */
function createServer(): McpServer {
  const server = new McpServer({ name: "open-library-mcp-server", version: "1.0.0" });
  registerSearchTools(server);
  registerDetailTools(server);
  return server;
}

serveStdio(createServer);
console.error("open-library-mcp-server running on stdio"); // stderr: stdout carries the protocol
