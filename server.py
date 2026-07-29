import json
import os
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

APP_VERSION = "1.22"
BLOB_API_URL = "https://blob.vercel-storage.com"
BLOB_FILENAME = "Debug.txt"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/version":
            self._send_json(200, {"version": APP_VERSION})
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/download":
            self._handle_download()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_download(self):
        token = os.environ.get("BLOB_READ_WRITE_TOKEN")
        if not token:
            self._send_json(500, {"error": "Blob storage is not connected"})
            return

        query = urllib.parse.urlencode({"prefix": BLOB_FILENAME, "limit": "1"})
        request = urllib.request.Request(
            f"{BLOB_API_URL}/?{query}",
            headers={
                "authorization": f"Bearer {token}",
                "x-api-version": "7",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                data = json.loads(response.read())
        except Exception:
            self._send_json(502, {"error": "Failed to reach blob storage"})
            return

        blobs = data.get("blobs", [])
        if not blobs:
            self._send_json(404, {"error": f"{BLOB_FILENAME} not found"})
            return

        self._send_json(200, {"url": f"{blobs[0]['url']}?download=1"})

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass


def main():
    server = HTTPServer(("0.0.0.0", 8000), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
