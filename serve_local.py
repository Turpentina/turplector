#!/usr/bin/env python3
"""
Serve the site over HTTP for local testing
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8080


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)


def main() -> None:
    with ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving {ROOT}")
        print(f"Open http://127.0.0.1:{PORT}/index.html")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
