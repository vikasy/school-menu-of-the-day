const axios = require('axios');
const cheerio = require('cheerio');

async function testAccessibleMenu() {
  console.log('Testing accessible menu fetching...\n');

  // Step 1: Get the redirect URL from the PDF link
  console.log('STEP 1: Following redirect from PDF link...');
  console.log('='.repeat(70));
  
  const pdfUrl = 'https://cusdk8nutrition.com/downloadMenu.php/1805092039571289/821356';
  const response = await axios.get(pdfUrl);
  const $ = cheerio.load(response.data);
  
  // Extract the redirect URL
  const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
  console.log('Meta refresh content:', metaRefresh);
  
  if (!metaRefresh) {
    console.log('❌ No meta refresh found');
    return;
  }
  
  const redirectMatch = metaRefresh.match(/url=(.*)/);
  if (!redirectMatch) {
    console.log('❌ Could not extract URL from meta refresh');
    return;
  }
  
  const redirectUrl = redirectMatch[1].replace(/&amp;/g, '&');
  
  console.log('✅ Found redirect URL:', redirectUrl);
  
  // Extract menu ID from URL
  const menuIdMatch = redirectUrl.match(/id=([a-f0-9]+)/);
  if (menuIdMatch) {
    console.log('✅ Menu ID:', menuIdMatch[1]);
  }
  
  console.log('\n⚠️  NOTE: This URL requires JavaScript to render the menu.');
  console.log('The page is a React/Angular app that loads menu data dynamically.');
  console.log('\nSince we can\'t use Puppeteer, let\'s try the OCR PDF version...');
  
  // Try the OCR PDF endpoint
  console.log('\nSTEP 2: Trying OCR PDF endpoint...');
  console.log('='.repeat(70));
  
  const menuId = menuIdMatch[1];
  const ocrPdfUrl = `https://www.schoolnutritionandfitness.com/webmenus2/#/ocr-pdf?id=${menuId}`;
  
  console.log('OCR PDF URL:', ocrPdfUrl);
  console.log('\n⚠️  This also requires JavaScript rendering.');
  console.log('\nLet\'s check if there\'s an API endpoint...');
  
  // Try to find API endpoint
  console.log('\nSTEP 3: Looking for API endpoint...');
  console.log('='.repeat(70));
  
  const apiUrl = `https://www.schoolnutritionandfitness.com/api/menu/${menuId}`;
  console.log('Trying:', apiUrl);
  
  try {
    const apiResponse = await axios.get(apiUrl);
    console.log('✅ API Response:', apiResponse.status);
    console.log(JSON.stringify(apiResponse.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ API returned:', error.response.status);
    } else {
      console.log('❌ API Error:', error.message);
    }
  }
  
  // Try another API pattern
  const apiUrl2 = `https://api.schoolnutritionandfitness.com/menu/${menuId}`;
  console.log('\nTrying:', apiUrl2);
  
  try {
    const apiResponse = await axios.get(apiUrl2);
    console.log('✅ API Response:', apiResponse.status);
    console.log(JSON.stringify(apiResponse.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ API returned:', error.response.status);
    } else {
      console.log('❌ API Error:', error.message);
    }
  }
}

testAccessibleMenu().catch(console.error);
