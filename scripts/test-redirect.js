const axios = require('axios');

async function testRedirect() {
  const pdfUrl = 'https://cusdk8nutrition.com/downloadMenu.php/1805092039571289/821356';
  
  console.log('Testing redirect without following...\n');
  
  try {
    const response = await axios.get(pdfUrl, {
      maxRedirects: 0,
      validateStatus: () => true // Accept any status
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('\nBody:');
    console.log(response.data);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRedirect();
