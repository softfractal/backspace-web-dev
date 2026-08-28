#!/usr/bin/env python3
"""backspace dev server — http.server with caching disabled.

The shared pair (bs-chrome.css/js) is edited under session locks and the
plain `python3 -m http.server` it replaced sends only Last-Modified, so
browsers heuristically cache the pair and a freshly edited engine keeps
serving stale — witnessed live at product-phase initiation (Aug 28: the
factored exports existed on disk while the page ran the cached copy).
No-store on every response ends the class of bug. Dev tool only; the
deploy realm sets its own cache policy.

Usage: python3 tools/dev-server.py [port]   (serves the Pages/ root)
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8480
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', PORT), NoStoreHandler).serve_forever()
