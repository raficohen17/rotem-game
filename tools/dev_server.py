#!/usr/bin/env python3
"""Static file server for development, with caching turned off.

`python -m http.server` sends no cache headers at all, so the browser applies
heuristic freshness and happily keeps serving an ES module it fetched minutes
ago. In a project with no build step that is a real trap: the file on disk is
right, the served file is right, and the page still runs the old code.

Production is the opposite — GitHub Pages plus the service worker in sw.js —
so this only ever runs locally.
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Quiet unless something actually failed.
        if not args or not str(args[1]).startswith("2"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    print(f"serving on http://localhost:{PORT} (no-store)")
    ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
