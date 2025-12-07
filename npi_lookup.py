import requests
import argparse
import json
import csv
import sys
import time

API_URL = "https://npiregistry.cms.hhs.gov/api/"

def get_npi_data(params):
    """
    Sends a request to the NPPES NPI Registry API.
    """
    params['version'] = '2.1'  # Always use version 2.1
    try:
        response = requests.get(API_URL, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to API: {e}", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print("Error decoding JSON response.", file=sys.stderr)
        return None

def flatten_provider_data(provider):
    """
    Flattens a provider record for CSV export.
    """
    basic = provider.get('basic', {})
    addresses = provider.get('addresses', [])
    taxonomies = provider.get('taxonomies', [])
    
    # Separate addresses by purpose
    mailing_address = {}
    location_address = {}
    
    for addr in addresses:
        purpose = addr.get('address_purpose')
        if purpose == 'MAILING':
            mailing_address = addr
        elif purpose == 'LOCATION':
            location_address = addr
            
    # Fallback if specific types aren't found (though usually they are)
    if not location_address and addresses:
        location_address = addresses[0]
    if not mailing_address and addresses:
        mailing_address = addresses[0]

    # Get primary taxonomy
    primary_taxonomy = {}
    for tax in taxonomies:
        if tax.get('primary'):
            primary_taxonomy = tax
            break
    if not primary_taxonomy and taxonomies:
        primary_taxonomy = taxonomies[0]

    return {
        'npi': provider.get('number'),
        'enumeration_type': provider.get('enumeration_type'),
        'status': basic.get('status', ''),
        'first_name': basic.get('first_name', ''),
        'last_name': basic.get('last_name', ''),
        'organization_name': basic.get('organization_name', ''),
        'credential': basic.get('credential', ''),
        'gender': basic.get('gender', ''),
        'primary_taxonomy_code': primary_taxonomy.get('code', ''),
        'primary_taxonomy_desc': primary_taxonomy.get('desc', ''),
        
        # Mailing Address
        'mailing_address_1': mailing_address.get('address_1', ''),
        'mailing_address_2': mailing_address.get('address_2', ''),
        'mailing_city': mailing_address.get('city', ''),
        'mailing_state': mailing_address.get('state', ''),
        'mailing_postal_code': mailing_address.get('postal_code', ''),
        'mailing_telephone': mailing_address.get('telephone_number', ''),
        'mailing_fax': mailing_address.get('fax_number', ''),
        
        # Practice Location Address
        'location_address_1': location_address.get('address_1', ''),
        'location_address_2': location_address.get('address_2', ''),
        'location_city': location_address.get('city', ''),
        'location_state': location_address.get('state', ''),
        'location_postal_code': location_address.get('postal_code', ''),
        'location_telephone': location_address.get('telephone_number', ''),
        'location_fax': location_address.get('fax_number', '')
    }

def main():
    parser = argparse.ArgumentParser(description="Search NPPES NPI Registry")
    
    # Search parameters
    parser.add_argument('--first_name', help="Provider's first name")
    parser.add_argument('--last_name', help="Provider's last name")
    parser.add_argument('--organization_name', help="Organization name")
    parser.add_argument('--city', help="City name")
    parser.add_argument('--state', help="State code (e.g., NY)")
    parser.add_argument('--postal_code', help="Zip code")
    parser.add_argument('--country_code', default='US', help="Country code (default: US)")
    parser.add_argument('--taxonomy_description', help="Taxonomy description")
    parser.add_argument('--number', help="NPI Number")
    parser.add_argument('--enumeration_type', default='NPI-1', choices=['NPI-1', 'NPI-2'], help="NPI-1 (Individual) or NPI-2 (Organization)")
    parser.add_argument('--limit', type=int, default=10, help="Number of results (max 200)")
    
    # Output options
    parser.add_argument('--output', help="Output file path (ends in .csv or .json)")
    
    args = parser.parse_args()

    # Build query parameters, filtering out None values
    params = {k: v for k, v in vars(args).items() if v is not None and k != 'output'}
    
    # Remove limit from params if it's the default and not explicitly needed by API (API has its own default)
    # But we want to control it, so we keep it.
    
    print(f"Searching with parameters: {params}...")
    
    data = get_npi_data(params)
    
    if not data:
        print("No data received or error occurred.")
        return

    result_count = data.get('result_count', 0)
    results = data.get('results', [])
    
    print(f"Found {result_count} results.")

    if args.output:
        if args.output.endswith('.json'):
            with open(args.output, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Results saved to {args.output}")
            
        elif args.output.endswith('.csv'):
            flat_results = [flatten_provider_data(p) for p in results]
            if flat_results:
                keys = flat_results[0].keys()
                with open(args.output, 'w', newline='') as f:
                    dict_writer = csv.DictWriter(f, fieldnames=keys)
                    dict_writer.writeheader()
                    dict_writer.writerows(flat_results)
                print(f"Results saved to {args.output}")
            else:
                print("No results to save to CSV.")
    else:
        # Print summary to console
        for p in results:
            basic = p.get('basic', {})
            name = f"{basic.get('first_name', '')} {basic.get('last_name', '')} {basic.get('organization_name', '')}".strip()
            print(f"NPI: {p.get('number')} | Name: {name} | Type: {p.get('enumeration_type')}")

if __name__ == "__main__":
    main()
