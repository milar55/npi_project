# NPI Registry Lookup Tool

Web tool to search the NPPES NPI Registry for healthcare providers with batch processing and CSV export.

## Features

- Search by zip code, name, organization, state, specialty
- Batch process multiple zip codes
- Autocomplete specialty dropdown (1000+ options)
- Export to CSV with practice/mailing addresses
- Real-time progress tracking

## Quick Start

### Setup

1. **Check Python Installation**
   - Open Command Prompt (Windows) or Terminal (Mac/Linux)
   - Type: `python --version` or `python3 --version`
   - You should see Python 3.x (e.g., Python 3.9.0)
   - If not installed, download from [python.org](https://www.python.org/downloads/)

2. **Download Project Files**
   - Extract all files to a folder (e.g., `C:\npi_project` or `~/npi_project`)
   - Keep all files together in the same folder

3. **Navigate to Project Folder**
   ```bash
   cd path/to/npi_project
   ```

4. **Run the Server**
   ```bash
   python proxy_server.py
   ```
   *Note: On Mac/Linux, you may need to use `python3` instead of `python`*

5. **Access the Application**
   - Browser opens automatically to `http://localhost:8001`
   - If not, manually open this URL in your browser


## Usage

1. Enter zip code(s) - one per line
2. Optional: Add filters (name, specialty, state)
3. Click "Start Batch Search"
4. Download CSV results


## Troubleshooting

**"python is not recognized" error**
- Python is not installed or not in your PATH
- Solution: Download and install Python from [python.org](https://www.python.org/downloads/)
- During installation, check "Add Python to PATH"

**"No module named..." or import errors**
- Good news! This project needs no extra packages
- Make sure you're running `proxy_server.py` (not a different file)

**Server starts but shows "Connection refused" or "Can't reach page"**
- Make sure the server is still running (don't close the terminal window)
- Try accessing `http://localhost:8001/index.html` directly
- Check if another program is using port 8001

**Search returns 0 providers**
- Verify the terminal shows "Starting NPI Proxy Server" (server is running)
- Check that zip codes are valid US postal codes (5 digits)
- Try a broader search (remove filters like name or specialty)
- Test with a known populated zip code like `10001` (New York)

**Specialty dropdown is empty or not showing**
- Check that `nucc_taxonomy_251.csv` file is in the same folder as other files
- Make sure all project files were extracted together

**Browser doesn't open automatically**
- Manually open your browser and go to: `http://localhost:8001`
- Make sure you include `http://` in the URL

**"Permission denied" error**
- On Mac/Linux: Try `python3 proxy_server.py`
- You may need administrator/sudo privileges: `sudo python3 proxy_server.py`
- Or choose a different port by editing `proxy_server.py` (change PORT = 8001)

**Download button doesn't work**
- Check if your browser is blocking pop-ups
- Try a different browser (Chrome, Firefox, Edge)
- Make sure JavaScript is enabled in browser settings
