// Debug script to see the context around PDF links
const axios = require('axios');
const cheerio = require('cheerio');

async function debugPDFContext() {
  console.log('Fetching menu page and analyzing PDF link context...\n');

  const baseUrl = 'https://cusdk8nutrition.com/index.php?sid=1805092039571289&page=menus';
  const response = await axios.get(baseUrl);
  const $ = cheerio.load(response.data);

  console.log('='.repeat(70));
  console.log('PDF LINKS WITH SURROUNDING CONTEXT');
  console.log('='.repeat(70));

  $('a[href*="downloadMenu.php"]').each((i, elem) => {
    const href = $(elem).attr('href');
    const linkText = $(elem).text().trim();

    // Get parent element and surrounding text
    const parent = $(elem).parent();
    const parentText = parent.text().trim();
    const parentHtml = parent.html();

    // Get previous and next siblings
    const prevSibling = parent.prev();
    const nextSibling = parent.next();

    console.log(`\nPDF LINK #${i + 1}:`);
    console.log('-'.repeat(70));
    console.log('Link Text:', linkText);
    console.log('Link URL:', href);
    console.log('Parent Tag:', parent.prop('tagName'));
    console.log('Parent Text (full):', parentText);
    console.log('\nPrevious Sibling Text:', prevSibling.text().trim());
    console.log('Next Sibling Text:', nextSibling.text().trim());

    // Look for nearby headings
    const nearbyH2 = $(elem).closest('div').find('h2').first().text();
    const nearbyH3 = $(elem).closest('div').find('h3').first().text();
    const nearbyH4 = $(elem).closest('div').find('h4').first().text();

    if (nearbyH2) console.log('Nearby H2:', nearbyH2);
    if (nearbyH3) console.log('Nearby H3:', nearbyH3);
    if (nearbyH4) console.log('Nearby H4:', nearbyH4);

    // Look at the parent's parent context
    const grandparent = parent.parent();
    const grandparentClass = grandparent.attr('class');
    const grandparentId = grandparent.attr('id');

    if (grandparentClass) console.log('Grandparent Class:', grandparentClass);
    if (grandparentId) console.log('Grandparent ID:', grandparentId);

    // Show a snippet of the HTML context
    console.log('\nHTML Context:');
    console.log(parentHtml.substring(0, 200) + '...');
  });

  console.log('\n' + '='.repeat(70));
  console.log('ANALYZING MENU STRUCTURE');
  console.log('='.repeat(70));

  // Look for all headings that might indicate menu sections
  $('h1, h2, h3, h4').each((i, elem) => {
    const text = $(elem).text().trim();
    const tag = $(elem).prop('tagName');
    if (text.toLowerCase().includes('menu') ||
        text.toLowerCase().includes('breakfast') ||
        text.toLowerCase().includes('lunch') ||
        text.toLowerCase().includes('elementary')) {
      console.log(`${tag}: ${text}`);
    }
  });
}

debugPDFContext().catch(console.error);
