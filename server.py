"""
Simple HTTP server to run the NPI Lookup web app.
This avoids CORS issues when running from file:// protocol.
"""
import http.server
import socketserver
import webbrowser
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

print(f"Starting server at http://localhost:{PORT}")
print(f"Serving files from: {DIRECTORY}")
print("\nPress Ctrl+C to stop the server\n")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    # Open browser automatically
    webbrowser.open(f'http://localhost:{PORT}/index.html')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
