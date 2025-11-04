const axios = require('axios');
const cheerio = require('cheerio');

async function testFetchMenu() {
  console.log('Testing updated fetchMenu logic...\n');
  console.log('='.repeat(70));
  
  const baseUrl = 'https://cusdk8nutrition.com/index.php?sid=1805092039571289&page=menus';
  
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);
  
  // Find PDF links
  const pdfLinks = [];
  $('a[href*="downloadMenu.php"]').each((i, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    const parent = $(elem).parent();
    const prevSibling = parent.prev();
    const context = prevSibling.text().trim();
    pdfLinks.push({ url: href, text, context });
  });
  
  console.log('Found', pdfLinks.length, 'PDF links\n');
  
  const breakfastLink = pdfLinks.find(link =>
    link.text.toLowerCase().includes('breakfast') &&
    link.context.toLowerCase().includes('elementary')
  );
  
  const lunchLink = pdfLinks.find(link =>
    link.text.toLowerCase().includes('lunch') &&
    link.context.toLowerCase().includes('elementary') &&
    !link.text.toLowerCase().includes('mcauliffe')
  );
  
  console.log('✅ Breakfast link found:', breakfastLink.text);
  console.log('   Context:', breakfastLink.context);
  console.log('✅ Lunch link found:', lunchLink.text);
  console.log('   Context:', lunchLink.context);
  console.log();
  
  // Follow breakfast redirect
  console.log('Following breakfast redirect...');
  const fullUrl = 'https://cusdk8nutrition.com' + breakfastLink.url;
  const redirectResponse = await axios.get(fullUrl, {
    maxRedirects: 0,
    validateStatus: () => true
  });
  
  const breakfastMenuUrl = redirectResponse.headers.location;
  console.log('✅ Breakfast Menu URL:', breakfastMenuUrl);
  
  // Follow lunch redirect
  console.log('\nFollowing lunch redirect...');
  const lunchFullUrl = 'https://cusdk8nutrition.com' + lunchLink.url;
  const lunchRedirect = await axios.get(lunchFullUrl, {
    maxRedirects: 0,
    validateStatus: () => true
  });
  
  const lunchMenuUrl = lunchRedirect.headers.location;
  console.log('✅ Lunch Menu URL:', lunchMenuUrl);
  
  console.log('\n' + '='.repeat(70));
  console.log('SUCCESS! Menu URLs extracted:');
  console.log('='.repeat(70));
  console.log('🥞 Breakfast:', breakfastMenuUrl);
  console.log('🍕 Lunch:', lunchMenuUrl);
}

testFetchMenu().catch(console.error);
