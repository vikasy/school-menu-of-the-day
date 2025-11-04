const axios = require('axios');
const pdfParse = require('pdf-parse');

async function testPDFDownload() {
  console.log('Testing PDF download and parsing...\n');

  const breakfastURL = 'https://cusdk8nutrition.com/downloadMenu.php/1805092039571289/821356';

  console.log('Downloading Breakfast PDF...');
  try {
    const response = await axios.get(breakfastURL, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    console.log('✅ Downloaded:', response.data.length, 'bytes');

    const pdfBuffer = Buffer.from(response.data);
    const data = await pdfParse(pdfBuffer);

    console.log('✅ PDF parsed successfully');
    console.log('✅ Text length:', data.text.length, 'characters');
    console.log('✅ Pages:', data.numpages);
    console.log('\n📄 Full PDF Text:');
    console.log('='.repeat(70));
    console.log(data.text);
    console.log('='.repeat(70));

    // Now test parsing today's menu
    console.log('\n🔍 Looking for today\'s menu...');
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[dayOfWeek];
    const todayDate = today.getDate();

    console.log(`Today is: ${todayName}, ${todayDate}`);

    const lines = data.text.split('\n').map(line => line.trim()).filter(line => line);

    console.log('\n📅 All lines in PDF:');
    lines.forEach((line, i) => {
      console.log(`${i}: ${line}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testPDFDownload().catch(console.error);
