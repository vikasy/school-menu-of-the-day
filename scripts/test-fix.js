const axios = require('axios');
const cheerio = require('cheerio');

async function testFix() {
  console.log('Testing fixed PDF link detection...\n');

  const baseUrl = 'https://cusdk8nutrition.com/index.php?sid=1805092039571289&page=menus';
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);

  // Find PDF links with context
  const pdfLinks = [];
  $('a[href*="downloadMenu.php"]').each((i, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();

    // Get context from previous sibling
    const parent = $(elem).parent();
    const prevSibling = parent.prev();
    const context = prevSibling.text().trim();

    pdfLinks.push({ url: href, text, context });
    console.log(`PDF #${i + 1}: ${text}`);
    console.log(`  Context: "${context}"`);
    console.log(`  URL: ${href}`);
    console.log();
  });

  // Find breakfast for elementary
  const breakfastLink = pdfLinks.find(link =>
    link.text.toLowerCase().includes('breakfast') &&
    link.context.toLowerCase().includes('elementary')
  );

  // Find lunch for elementary (not McAuliffe)
  const lunchLink = pdfLinks.find(link =>
    link.text.toLowerCase().includes('lunch') &&
    link.context.toLowerCase().includes('elementary') &&
    !link.text.toLowerCase().includes('mcauliffe')
  );

  console.log('='.repeat(60));
  console.log('RESULTS:');
  console.log('='.repeat(60));

  if (breakfastLink) {
    console.log('✅ Found Elementary Breakfast:');
    console.log('   Text:', breakfastLink.text);
    console.log('   Context:', breakfastLink.context);
    console.log('   URL:', breakfastLink.url);
  } else {
    console.log('❌ Elementary Breakfast not found');
  }

  console.log();

  if (lunchLink) {
    console.log('✅ Found Elementary Lunch:');
    console.log('   Text:', lunchLink.text);
    console.log('   Context:', lunchLink.context);
    console.log('   URL:', lunchLink.url);
  } else {
    console.log('❌ Elementary Lunch not found');
  }
}

testFix().catch(console.error);
