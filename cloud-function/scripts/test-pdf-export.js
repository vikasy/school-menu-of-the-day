const axios = require('axios');

async function testPDFExport() {
  console.log('Testing PDF export endpoints...\n');
  
  const menuId = '68ff1cba1ed0d460104ecceb';
  
  const urls = [
    `https://www.schoolnutritionandfitness.com/webmenus2/pdf/${menuId}`,
    `https://www.schoolnutritionandfitness.com/webmenus2/export/pdf/${menuId}`,
    `https://www.schoolnutritionandfitness.com/webmenus2/print/${menuId}`,
    `https://www.schoolnutritionandfitness.com/api/export/pdf/${menuId}`,
    `https://cusdk8nutrition.com/exportMenu.php?id=${menuId}`,
    `https://cusdk8nutrition.com/printMenu.php?id=${menuId}`,
  ];
  
  for (const url of urls) {
    console.log('Trying:', url);
    try {
      const response = await axios.get(url, { 
        timeout: 5000,
        responseType: 'arraybuffer',
        validateStatus: () => true
      });
      
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers['content-type']);
      
      if (response.headers['content-type']?.includes('pdf')) {
        console.log('✅ FOUND PDF! Size:', response.data.length, 'bytes');
        // Save it
        const fs = require('fs');
        fs.writeFileSync('test-menu.pdf', response.data);
        console.log('Saved as test-menu.pdf\n');
        break;
      } else {
        console.log('Not a PDF\n');
      }
    } catch (error) {
      console.log('Error:', error.message, '\n');
    }
  }
}

testPDFExport().catch(console.error);
