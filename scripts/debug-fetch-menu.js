// Debug script to test fetchMenu function line by line
const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');

console.log('='.repeat(60));
console.log('DEBUGGING FETCH MENU FUNCTION');
console.log('='.repeat(60));
console.log();

// Step 1: Fetch the base menu page
async function step1_fetchBasePage() {
  console.log('STEP 1: Fetching base menu page...');
  console.log('-'.repeat(60));

  try {
    const baseUrl = 'https://cusdk8nutrition.com/index.php?sid=1805092039571289&page=menus';
    console.log('URL:', baseUrl);

    const response = await axios.get(baseUrl);
    console.log('✅ Status:', response.status);
    console.log('✅ Content Length:', response.data.length, 'bytes');
    console.log('✅ Content Type:', response.headers['content-type']);

    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Step 2: Find accessible menu links
async function step2_findAccessibleLinks(html) {
  console.log('\nSTEP 2: Finding accessible menu links...');
  console.log('-'.repeat(60));

  try {
    const $ = cheerio.load(html);
    let accessibleMenuUrl = null;
    let count = 0;

    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.includes('schoolnutritionandfitness.com/webmenus')) {
        accessibleMenuUrl = href;
        count++;
        console.log(`✅ Found accessible menu link #${count}:`, href);

        // Extract menu ID
        const menuIdMatch = href.match(/id=([a-f0-9]+)/);
        if (menuIdMatch) {
          console.log('   Menu ID:', menuIdMatch[1]);
        }
      }
    });

    if (count === 0) {
      console.log('⚠️  No accessible menu links found');
    }

    return accessibleMenuUrl;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Step 3: Find PDF links
async function step3_findPDFLinks(html) {
  console.log('\nSTEP 3: Finding PDF download links...');
  console.log('-'.repeat(60));

  try {
    const $ = cheerio.load(html);
    const pdfLinks = [];

    $('a[href*="downloadMenu.php"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      pdfLinks.push({ url: href, text });
      console.log(`✅ PDF Link #${i + 1}:`, text);
      console.log('   URL:', href);
    });

    if (pdfLinks.length === 0) {
      console.log('⚠️  No PDF links found');
    } else {
      console.log(`\n✅ Total PDF links found: ${pdfLinks.length}`);
    }

    return pdfLinks;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

// Step 4: Find breakfast and lunch PDFs
async function step4_identifyMenuPDFs(pdfLinks) {
  console.log('\nSTEP 4: Identifying breakfast and lunch PDFs...');
  console.log('-'.repeat(60));

  const breakfastLink = pdfLinks.find(link =>
    link.text.toLowerCase().includes('breakfast') &&
    link.text.toLowerCase().includes('elementary')
  );

  const lunchLink = pdfLinks.find(link =>
    link.text.toLowerCase().includes('lunch') &&
    link.text.toLowerCase().includes('elementary') &&
    !link.text.toLowerCase().includes('mcauliffe')
  );

  if (breakfastLink) {
    console.log('✅ Breakfast PDF:', breakfastLink.text);
    console.log('   URL:', breakfastLink.url);
  } else {
    console.log('❌ Breakfast PDF not found');
  }

  if (lunchLink) {
    console.log('✅ Lunch PDF:', lunchLink.text);
    console.log('   URL:', lunchLink.url);
  } else {
    console.log('❌ Lunch PDF not found');
  }

  return { breakfastLink, lunchLink };
}

// Step 5: Download and parse a PDF
async function step5_downloadAndParsePDF(pdfLink, type) {
  console.log(`\nSTEP 5: Downloading and parsing ${type} PDF...`);
  console.log('-'.repeat(60));

  if (!pdfLink) {
    console.log(`⚠️  No ${type} PDF link provided`);
    return null;
  }

  try {
    const fullUrl = pdfLink.url.startsWith('http') ?
      pdfLink.url :
      `https://cusdk8nutrition.com/${pdfLink.url}`;

    console.log('Downloading from:', fullUrl);

    const response = await axios.get(fullUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    console.log('✅ Downloaded:', response.data.length, 'bytes');

    const pdfBuffer = Buffer.from(response.data);
    const data = await pdfParse(pdfBuffer);

    console.log('✅ PDF parsed successfully');
    console.log('✅ Text length:', data.text.length, 'characters');
    console.log('\n📄 First 500 characters of PDF text:');
    console.log('-'.repeat(60));
    console.log(data.text.substring(0, 500));
    console.log('-'.repeat(60));

    return data.text;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Step 6: Parse today's menu from text
async function step6_parseTodaysMenu(text, type) {
  console.log(`\nSTEP 6: Parsing today's ${type} menu from text...`);
  console.log('-'.repeat(60));

  if (!text) {
    console.log(`⚠️  No text provided for ${type}`);
    return [];
  }

  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[dayOfWeek];
    const todayDate = today.getDate();

    console.log('Looking for:', todayName, '(date:', todayDate + ')');

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    console.log('✅ Total lines in PDF:', lines.length);

    // Show all lines that contain day names or dates
    console.log('\n📅 Lines containing day names or date:');
    lines.forEach((line, i) => {
      const hasDayName = dayNames.some(day => line.includes(day));
      const hasDate = line.includes(todayDate.toString());
      if (hasDayName || hasDate) {
        console.log(`   Line ${i}:`, line);
      }
    });

    const menuItems = [];

    // Look for lines that might contain today's menu
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line contains today's day or date
      if (line.includes(todayName) || line.includes(todayDate.toString())) {
        console.log(`\n✅ Found matching line at index ${i}:`, line);
        console.log('   Extracting next 10 lines as menu items:');

        // Collect next few lines as menu items
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const menuLine = lines[j];

          // Stop if we hit another day
          if (dayNames.some(day => menuLine.includes(day))) {
            console.log(`   Stopped at line ${j} (found another day):`, menuLine);
            break;
          }

          // Skip empty or very short lines
          if (menuLine.length > 3 && !menuLine.match(/^\d+$/)) {
            menuItems.push(menuLine);
            console.log(`   ✅ Item ${menuItems.length}:`, menuLine);
          } else {
            console.log(`   ⏭️  Skipped line ${j}:`, menuLine, '(too short or just numbers)');
          }
        }
        break;
      }
    }

    if (menuItems.length === 0) {
      console.log('❌ No menu items found for today');
    } else {
      console.log(`\n✅ Found ${menuItems.length} menu items`);
    }

    return menuItems;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

// Main debugging flow
async function debugFetchMenu() {
  try {
    // Step 1: Fetch base page
    const html = await step1_fetchBasePage();
    if (!html) {
      console.log('\n❌ Failed at Step 1. Cannot continue.');
      return;
    }

    // Step 2: Find accessible links
    await step2_findAccessibleLinks(html);

    // Step 3: Find PDF links
    const pdfLinks = await step3_findPDFLinks(html);
    if (pdfLinks.length === 0) {
      console.log('\n❌ Failed at Step 3. Cannot continue.');
      return;
    }

    // Step 4: Identify breakfast and lunch PDFs
    const { breakfastLink, lunchLink } = await step4_identifyMenuPDFs(pdfLinks);

    // Step 5 & 6: Download and parse breakfast
    if (breakfastLink) {
      const breakfastText = await step5_downloadAndParsePDF(breakfastLink, 'Breakfast');
      const breakfastItems = await step6_parseTodaysMenu(breakfastText, 'Breakfast');

      console.log('\n' + '='.repeat(60));
      console.log('BREAKFAST RESULT:');
      console.log('='.repeat(60));
      if (breakfastItems.length > 0) {
        breakfastItems.forEach((item, i) => console.log(`${i + 1}. ${item}`));
      } else {
        console.log('❌ No breakfast items found');
      }
    }

    // Step 5 & 6: Download and parse lunch
    if (lunchLink) {
      const lunchText = await step5_downloadAndParsePDF(lunchLink, 'Lunch');
      const lunchItems = await step6_parseTodaysMenu(lunchText, 'Lunch');

      console.log('\n' + '='.repeat(60));
      console.log('LUNCH RESULT:');
      console.log('='.repeat(60));
      if (lunchItems.length > 0) {
        lunchItems.forEach((item, i) => console.log(`${i + 1}. ${item}`));
      } else {
        console.log('❌ No lunch items found');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('DEBUGGING COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error(error.stack);
  }
}

// Run the debug
debugFetchMenu();
