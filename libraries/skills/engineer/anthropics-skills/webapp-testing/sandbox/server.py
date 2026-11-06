#!/usr/bin/env python3
"""Serve sandbox/app over HTTP on port 8931."""
import http.server
import socketserver
import functools

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory='app')
with socketserver.TCPServer(('127.0.0.1', 8931), handler) as httpd:
    print('Serving on http://127.0.0.1:8931')
    httpd.serve_forever()
