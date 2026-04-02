import http.server
import socketserver

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

class NoCacheHandler(Handler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        Handler.end_headers(self)

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
