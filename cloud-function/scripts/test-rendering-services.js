const axios = require('axios');

async function testRenderingServices() {
  const targetUrl = 'https://www.schoolnutritionandfitness.com/webmenus2/#/view?id=68ff1cba1ed0d460104ecceb&siteCode=1641';
  
  console.log('Testing rendering services for URL:');
  console.log(targetUrl);
  console.log('='.repeat(70));
  
  // Test 1: Google's PageSpeed Insights API (free, no key needed for basic use)
  console.log('\n1. Testing Google PageSpeed API...');
  try {
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}`;
    const response = await axios.get(psiUrl, { timeout: 30000 });
    
    if (response.data.lighthouseResult) {
      console.log('✅ PageSpeed API works!');
      const content = response.data.lighthouseResult.audits['final-screenshot'];
      console.log('Can get screenshots:', !!content);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: Try Puppeteer-as-a-Service free tier (render.com or similar)
  console.log('\n2. Testing Playwright HTML endpoint...');
  try {
    // This is a hypothetical endpoint - we'd need to check if such services exist
    const playwrightUrl = `https://htmlrender.kxcdn.com/api/render?url=${encodeURIComponent(targetUrl)}`;
    const response = await axios.get(playwrightUrl, { timeout: 10000 });
    console.log('✅ HTML Render works! Length:', response.data.length);
    console.log('Sample:', response.data.substring(0, 500));
  } catch (error) {
    console.log('❌ Not available or error:', error.message);
  }
  
  // Test 3: Microlink API (has free tier)
  console.log('\n3. Testing Microlink API (free tier)...');
  try {
    const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url`;
    const response = await axios.get(microlinkUrl, { timeout: 15000 });
    
    if (response.data.status === 'success') {
      console.log('✅ Microlink works!');
      console.log('Screenshot URL:', response.data.data.screenshot?.url);
      
      // Try to get HTML
      const htmlUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&meta=false`;
      const htmlResponse = await axios.get(htmlUrl, { timeout: 15000 });
      console.log('HTML data available:', !!htmlResponse.data.data);
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
  
  // Test 4: Try simple screenshot API
  console.log('\n4. Testing Screenshot API...');
  try {
    const screenshotUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(targetUrl)}&output=json&file_type=png&wait_for_event=load`;
    const response = await axios.get(screenshotUrl, { timeout: 15000 });
    console.log('✅ Screenshot API response:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 5: Simple approach - see if page has any text we can extract directly
  console.log('\n5. Direct page load test (may fail due to JS)...');
  try {
    const response = await axios.get(targetUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('Page loaded. Length:', response.data.length);
    
    // Check if any menu data is embedded in HTML
    if (response.data.includes('Breakfast') || response.data.includes('Lunch')) {
      console.log('✅ Found menu keywords in HTML!');
      console.log('This might work with proper parsing...');
    } else {
      console.log('❌ No menu data in initial HTML (needs JS rendering)');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testRenderingServices().catch(console.error);
