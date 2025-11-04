const axios = require('axios');

async function testRenderingServices() {
  const targetUrl = 'https://www.schoolnutritionandfitness.com/webmenus2/#/view?id=68ff1cba1ed0d460104ecceb&siteCode=1641';

  console.log('Testing rendering services for URL:');
  console.log(targetUrl);
  console.log('='.repeat(70));

  // Test 1: Microlink API (has free tier - 50 req/day)
  console.log('\n1. Testing Microlink API (free tier)...');
  try {
    const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false`;
    console.log('URL:', microlinkUrl);

    const response = await axios.get(microlinkUrl, { timeout: 20000 });

    if (response.data.status === 'success') {
      console.log('✅ Microlink works!');
      console.log('Screenshot URL:', response.data.data.screenshot?.url);
      console.log('Title:', response.data.data.title);
      console.log('HTML length:', response.data.data.html?.length || 'N/A');

      // If we got HTML, check for menu content
      if (response.data.data.html) {
        const html = response.data.data.html;
        if (html.includes('Breakfast') || html.includes('Lunch') || html.includes('menu')) {
          console.log('✅✅ FOUND MENU CONTENT IN HTML!');
          console.log('Sample:', html.substring(0, 500));
        }
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 2: Try ScrapingBee (has free tier)
  console.log('\n2. Testing ScrapingBee API (requires key)...');
  console.log('⚠️  Skipping - requires API key');

  // Test 3: Simple direct page load
  console.log('\n3. Direct page load test (will likely fail due to JS)...');
  try {
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('✅ Page loaded. Length:', response.data.length);

    // Check if any menu data is embedded in HTML
    const hasBreakfast = response.data.toLowerCase().includes('breakfast');
    const hasLunch = response.data.toLowerCase().includes('lunch');
    const hasMenu = response.data.toLowerCase().includes('menu');

    console.log('Contains "breakfast":', hasBreakfast);
    console.log('Contains "lunch":', hasLunch);
    console.log('Contains "menu":', hasMenu);

    if (hasBreakfast || hasLunch) {
      console.log('✅ Found menu keywords in HTML!');
      console.log('First 1000 chars:', response.data.substring(0, 1000));
    } else {
      console.log('❌ No menu data in initial HTML (needs JS rendering)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: Check if there's a simpler non-JS version
  console.log('\n4. Testing if there\'s a print/simple version...');
  const simpleUrls = [
    'https://www.schoolnutritionandfitness.com/webmenus2/view?id=68ff1cba1ed0d460104ecceb',
    'https://www.schoolnutritionandfitness.com/webmenus2/simple?id=68ff1cba1ed0d460104ecceb',
    'https://www.schoolnutritionandfitness.com/menu/68ff1cba1ed0d460104ecceb',
  ];

  for (const url of simpleUrls) {
    try {
      const response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      console.log(`${url.split('/').pop()}: Status ${response.status}, Has menu content:`,
        response.data.toLowerCase().includes('breakfast'));
    } catch (error) {
      console.log(`${url.split('/').pop()}: Error -`, error.message);
    }
  }
}

testRenderingServices().catch(console.error);
