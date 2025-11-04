const axios = require('axios');

async function testMenuAPI() {
  const menuId = '68ff1cba1ed0d460104ecceb';
  const siteCode = '1641';
  
  const endpoints = [
    `https://www.schoolnutritionandfitness.com/api/menuController?id=${menuId}`,
    `https://www.schoolnutritionandfitness.com/api/menuController/${menuId}`,
    `https://www.schoolnutritionandfitness.com/api/menuController?menuid=${menuId}&sitecode=${siteCode}`,
    `https://www.schoolnutritionandfitness.com/webmenus2/api/menuController?id=${menuId}`,
  ];
  
  for (const url of endpoints) {
    console.log('\nTrying:', url);
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 5000
      });
      
      console.log('✅ SUCCESS! Status:', response.status);
      console.log('Data:', JSON.stringify(response.data, null, 2));
      break;
    } catch (error) {
      if (error.response) {
        console.log('❌ Status:', error.response.status);
      } else {
        console.log('❌ Error:', error.message);
      }
    }
  }
}

testMenuAPI().catch(console.error);
