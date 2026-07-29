import json
from http.server import BaseHTTPRequestHandler, HTTPServer

APP_VERSION = "1.21"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/version":
            body = json.dumps({"version": APP_VERSION}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    server = HTTPServer(("0.0.0.0", 8000), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
