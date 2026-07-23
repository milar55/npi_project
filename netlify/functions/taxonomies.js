const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

let cachedTaxonomies = null;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (!cachedTaxonomies) {
      // Read CSV from root directory
      const csvPath = path.join(__dirname, '../../nucc_taxonomy_251.csv');
      const csvData = fs.readFileSync(csvPath, 'utf-8');
      
      const records = csv.parse(csvData, {
        columns: true,
        skip_empty_lines: true,
      });

      cachedTaxonomies = records.map((row) => ({
        code: row.Code,
        desc: row.Specialization ? `${row.Classification} - ${row.Specialization}` : row.Classification,
        grouping: row.Grouping,
      })).filter(t => t.code);

      console.log(`Loaded ${cachedTaxonomies.length} taxonomies`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cachedTaxonomies),
    };
  } catch (error) {
    console.error('Error loading taxonomies:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
