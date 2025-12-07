"""
NPI Registry API Proxy Server
Fetches data from NPPES API server-side to avoid CORS/network issues
"""
import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
from urllib.error import HTTPError, URLError
from datetime import datetime

import csv

PORT = 8001
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
NPI_API_URL = "https://npiregistry.cms.hhs.gov/api/"
TAXONOMY_FILE = os.path.join(DIRECTORY, "nucc_taxonomy_251.csv")

# Cache for taxonomies
TAXONOMIES = []

def load_taxonomies():
    global TAXONOMIES
    if not os.path.exists(TAXONOMY_FILE):
        print(f"Warning: Taxonomy file not found at {TAXONOMY_FILE}")
        return

    try:
        with open(TAXONOMY_FILE, mode='r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            temp_taxonomies = []
            for row in reader:
                # NUCC CSV headers usually: Code, Grouping, Classification, Specialization, Definition, Notes
                # We want Code and a display name (Classification + Specialization)
                code = row.get('Code')
                grouping = row.get('Grouping')
                classification = row.get('Classification')
                specialization = row.get('Specialization')
                
                if not code:
                    continue

                # Construct a display name
                display = classification
                if specialization:
                    display = f"{classification} - {specialization}"
                
                # Add grouping if needed, but usually Class - Spec is enough
                
                temp_taxonomies.append({
                    'code': code,
                    'desc': display,
                    'grouping': grouping
                })
            
            TAXONOMIES = temp_taxonomies
            print(f"Loaded {len(TAXONOMIES)} taxonomies from {TAXONOMY_FILE}")
    except Exception as e:
        print(f"Error loading taxonomies: {e}")

# Load on startup
load_taxonomies()

class NPIProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        # Handle API proxy requests
        if self.path.startswith('/api/npi?'):
            self.handle_npi_request()
        elif self.path == '/api/taxonomies':
            self.handle_taxonomies_request()
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        # Handle email save request
        if self.path == '/api/save-email':
            self.handle_save_email()
        else:
            self.send_error(404, "Not Found")
    
    def handle_taxonomies_request(self):
        try:
            data = json.dumps(TAXONOMIES).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, f"Server Error: {str(e)}")

    def handle_npi_request(self):
        try:
            # Parse query parameters
            query_string = self.path.split('?', 1)[1] if '?' in self.path else ''
            params = urllib.parse.parse_qs(query_string)
            
            # Build API URL
            # Map frontend params to NPI API params
            # We now pass through all valid params dynamically
            
            valid_params = [
                'number', 'taxonomy_description', 'taxonomy', 'postal_code', 'limit', 'country_code', 
                'enumeration_type', 'first_name', 'last_name', 'organization_name', 'state', 'skip'
            ]
            
            api_params = {'version': '2.1'}
            
            for param in valid_params:
                # Get param from query string if it exists
                val = params.get(param, [None])[0]
                if val:
                    api_params[param] = val
            
            # Ensure defaults if not provided
            if 'limit' not in api_params:
                api_params['limit'] = '10'
            if 'country_code' not in api_params:
                api_params['country_code'] = 'US'
            
            url = f"{NPI_API_URL}?{urllib.parse.urlencode(api_params)}"
            print(f"Fetching: {url}")
            
            # Make request to NPI API
            with urllib.request.urlopen(url, timeout=30) as response:
                data = response.read()
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            
        except HTTPError as e:
            self.send_error(e.code, f"API Error: {e.reason}")
        except URLError as e:
            self.send_error(500, f"Network Error: {e.reason}")
        except Exception as e:
            self.send_error(500, f"Server Error: {str(e)}")

    def handle_save_email(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            email = data.get('email', '')
            zip_codes = data.get('zip_codes', '')
            result_count = data.get('result_count', 0)

            # Create data directory if it doesn't exist
            data_dir = os.path.join(DIRECTORY, 'data')
            os.makedirs(data_dir, exist_ok=True)

            # Path to emails CSV file
            emails_file = os.path.join(data_dir, 'user_emails.csv')

            # Check if file exists to determine if we need to write headers
            file_exists = os.path.exists(emails_file)

            # Append email to CSV file
            with open(emails_file, 'a', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)

                # Write header if new file
                if not file_exists:
                    writer.writerow(['timestamp', 'email', 'zip_codes', 'result_count'])

                # Write email data
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                writer.writerow([timestamp, email, zip_codes.replace('\n', ','), result_count])

            print(f"Email saved: {email} ({result_count} results)")

            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = json.dumps({'success': True}).encode('utf-8')
            self.wfile.write(response)

        except Exception as e:
            print(f"Error saving email: {str(e)}")
            self.send_error(500, f"Server Error: {str(e)}")

print(f"Starting NPI Proxy Server at http://localhost:{PORT}")
print(f"Serving files from: {DIRECTORY}")
print(f"API Proxy: http://localhost:{PORT}/api/npi?zipcode=77478&limit=10")
print(f"Taxonomies: http://localhost:{PORT}/api/taxonomies")
print("\nPress Ctrl+C to stop the server\n")

with socketserver.TCPServer(("", PORT), NPIProxyHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
