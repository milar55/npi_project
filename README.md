# NPPES NPI Registry Lookup Tool

This project provides tools to search the NPPES NPI Registry API for healthcare providers. It includes a Python CLI tool for batch processing and a Web Interface for user-friendly searching.

## Features

- **Search by Criteria**: Search by taxonomy (specialty), city, state, zip code, etc.
- **Detailed Output**: Extracts comprehensive provider details including:
  - **Status** (Active/Inactive)
  - **Mailing Address** (with Suite/Apt numbers)
  - **Practice Location Address** (with Suite/Apt numbers)
  - **Taxonomy** details
- **Batch Processing**: Support for multiple zip codes.
- **CSV Export**: Download results in a detailed CSV format.

## Setup

1.  **Prerequisites**: Python 3.x installed.
2.  **Installation**: No external dependencies required for the basic script (uses standard library `urllib` in proxy, `requests` in lookup).
    *   If using `npi_lookup.py`, install requests: `pip install requests`

## Usage

### 1. Python CLI Tool (`npi_lookup.py`)

Run the script from the command line:

```bash
python npi_lookup.py --city "New York" --state NY --limit 10 --output results.csv
```

**Arguments:**
- `--first_name`, `--last_name`, `--organization_name`
- `--city`, `--state`, `--postal_code`, `--country_code`
- `--taxonomy_description`
- `--number` (NPI Number)
- `--enumeration_type` (NPI-1 or NPI-2)
- `--limit` (default 10)
- `--output` (file path, .csv or .json)

### 2. Web Interface

To use the web interface, you need to run the proxy server to handle API requests (avoids CORS issues).

1.  **Start the Proxy Server**:
    ```bash
    python proxy_server.py
    ```
    This will start a server at `http://localhost:8001`.

2.  **Open the App**:
    Open `http://localhost:8001/index.html` in your browser.

3.  **Search**:
    - Enter a Taxonomy (default: Obstetrics & Gynecology).
    - Enter Zip Codes (one per line).
    - Click "Search Providers".
    - Download results as CSV.

## Data Fields

The exported CSV includes:
- **NPI**: National Provider Identifier
- **Status**: Active (A) or other status codes.
- **Enumeration Type**: NPI-1 (Individual) or NPI-2 (Organization)
- **Basic Info**: Name, Credential, Gender
- **Taxonomy**: Primary specialty code and description.
- **Location Address**: Full address including Suite/Apt (`address_2`), City, State, Zip, Phone, Fax.
- **Mailing Address**: Full address including Suite/Apt (`address_2`), City, State, Zip, Phone, Fax.
