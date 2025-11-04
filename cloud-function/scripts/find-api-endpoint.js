const axios = require('axios');

async function findAPI() {
  console.log('Looking for API endpoints by analyzing the JavaScript files...\n');
  
  // Get the main JS file
  const jsUrls = [
    'https://www.schoolnutritionandfitness.com/dist/omdfrontend-b1f25d76f99da02ee532.js',
    'https://www.schoolnutritionandfitness.com/dist/vendors-0fb274e9de111f663985.js'
  ];
  
  for (const url of jsUrls) {
    console.log('Analyzing:', url.split('/').pop());
    try {
      const response = await axios.get(url);
      const js = response.data;
      
      // Look for API endpoint patterns
      const apiPatterns = [
        /api[/\\]["']([^"']+)/gi,
        /\/api\/([a-z]+)/gi,
        /endpoint.*?["']([^"']+)/gi,
        /baseURL.*?["']([^"']+)/gi
      ];
      
      const found = new Set();
      apiPatterns.forEach(pattern => {
        const matches = js.matchAll(pattern);
        for (const match of matches) {
          found.add(match[0]);
        }
      });
      
      if (found.size > 0) {
        console.log('Found', found.size, 'potential endpoints:');
        Array.from(found).slice(0, 10).forEach(endpoint => {
          console.log('  -', endpoint);
        });
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }
}

findAPI().catch(console.error);
