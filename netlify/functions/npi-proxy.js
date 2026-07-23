const https = require('https');
const url = require('url');

const NPI_API_URL = 'https://npiregistry.cms.hhs.gov/api/';

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Get query parameters
    const queryParams = event.queryStringParameters || {};

    // Build API URL with valid params
    const validParams = [
      'number', 'taxonomy_description', 'taxonomy', 'postal_code', 'limit',
      'country_code', 'enumeration_type', 'first_name', 'last_name',
      'organization_name', 'state', 'skip', 'version'
    ];

    const apiParams = new url.URLSearchParams({ version: '2.1' });

    for (const param of validParams) {
      if (queryParams[param]) {
        apiParams.set(param, queryParams[param]);
      }
    }

    // Set defaults
    if (!apiParams.has('limit')) apiParams.set('limit', '10');
    if (!apiParams.has('country_code')) apiParams.set('country_code', 'US');

    const apiUrl = `${NPI_API_URL}?${apiParams.toString()}`;
    console.log('Fetching:', apiUrl);

    // Make request to NPI API
    const data = await fetchURL(apiUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function fetchURL(urlString) {
  return new Promise((resolve, reject) => {
    https.get(urlString, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}
