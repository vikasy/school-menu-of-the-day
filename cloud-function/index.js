const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cheerio = require('cheerio');

const GRAPHQL_ENDPOINT = 'https://api.isitesoftware.com/graphql';
const MENU_CONTROLLER_OPEN_ENDPOINT = 'https://www.schoolnutritionandfitness.com/webmenus2/api/menuController.php/open';
const REQUEST_TIMEOUT_MS = 15000;

const MENU_GRAPHQL_QUERY = `query detailsCalendarAlphaPage($menu_type_id: String!, $start_date: String!, $end_date: String!) {
  menuType(id: $menu_type_id) {
    id
    name
    items(start_date: $start_date, end_date: $end_date) {
      date
      product {
        id
        name
        long_description
        is_ancillary
        hide_on_calendars
        hide_on_web_menu_view
      }
    }
  }
}`;

// Initialize Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

function escapeHtml(input) {
  if (input === null || input === undefined) {
    return '';
  }
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseMenuParams(menuUrl) {
  if (!menuUrl) {
    return { menuId: null, siteCode: null, menuType: null };
  }

  try {
    const urlObj = new URL(menuUrl);
    const combinedParams = new URLSearchParams(urlObj.search);

    if (urlObj.hash) {
      const hash = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.hash;
      const [, query] = hash.split('?');
      if (query) {
        const hashParams = new URLSearchParams(query);
        hashParams.forEach((value, key) => {
          combinedParams.set(key, value);
        });
      }
    }

    return {
      menuId: combinedParams.get('id'),
      siteCode: combinedParams.get('siteCode') || combinedParams.get('sitecode'),
      menuType: combinedParams.get('menuType') || combinedParams.get('menu_type')
    };
  } catch (error) {
    console.error('Unable to parse menu URL:', error.message);
    return { menuId: null, siteCode: null, menuType: null };
  }
}

function formatDateString(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${mm}/${dd}/${year}`;
}

function buildDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateKey(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parts = value.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const [monthStr, dayStr, yearStr] = parts;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

  if ([month, day, year].some(num => Number.isNaN(num))) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function fetchMenuItemsForUrl(menuUrl, todayKey, mealLabel) {
  if (!menuUrl) {
    return { items: [], error: `${mealLabel} menu link unavailable.` };
  }

  const { menuId } = parseMenuParams(menuUrl);
  if (!menuId) {
    return { items: [], error: `Could not identify ${mealLabel.toLowerCase()} menu ID.` };
  }

  try {
    const openResponse = await axios.get(MENU_CONTROLLER_OPEN_ENDPOINT, {
      params: { id: menuId },
      timeout: REQUEST_TIMEOUT_MS
    });

    const menuData = openResponse.data;
    if (!menuData || !menuData.menu_type) {
      return { items: [], error: `Menu data missing for ${mealLabel.toLowerCase()} menu.` };
    }

    const now = new Date();
    const year = typeof menuData.year === 'number' ? menuData.year : now.getFullYear();
    const monthIndex = typeof menuData.month === 'number' ? menuData.month : now.getMonth();
    const oneBasedMonth = Math.min(Math.max(monthIndex + 1, 1), 12);
    const lastDayOfMonth = new Date(year, oneBasedMonth, 0).getDate();

    const variables = {
      menu_type_id: menuData.menu_type,
      start_date: formatDateString(year, oneBasedMonth, 1),
      end_date: formatDateString(year, oneBasedMonth, lastDayOfMonth)
    };

    const graphResponse = await axios.post(GRAPHQL_ENDPOINT, {
      query: MENU_GRAPHQL_QUERY,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: REQUEST_TIMEOUT_MS
    });

    if (Array.isArray(graphResponse.data?.errors) && graphResponse.data.errors.length > 0) {
      const message = graphResponse.data.errors.map(err => err.message).join('; ');
      console.error(`GraphQL errors for ${mealLabel}: ${message}`);
      return { items: [], error: `Unable to load ${mealLabel.toLowerCase()} menu items.` };
    }

    const menuItems = graphResponse.data?.data?.menuType?.items || [];
    const todaysItems = menuItems.filter(item => normalizeDateKey(item?.date) === todayKey && item?.product);

    const seen = new Set();
    const cleaned = [];

    todaysItems.forEach(item => {
      const product = item.product;
      if (!product || !product.name) {
        return;
      }

      if (product.hide_on_calendars || product.hide_on_web_menu_view) {
        return;
      }

      if (seen.has(product.id)) {
        return;
      }

      seen.add(product.id);
      const name = product.name.trim();
      const description = typeof product.long_description === 'string'
        ? product.long_description.replace(/\s+/g, ' ').trim()
        : '';
      cleaned.push(description ? `${name} - ${description}` : name);
    });

    return { items: cleaned };
  } catch (error) {
    const message = error.response?.status ? `${error.message} (status ${error.response.status})` : error.message;
    console.error(`Error fetching ${mealLabel} menu items:`, message);
    return { items: [], error: `Unable to fetch ${mealLabel.toLowerCase()} menu items.` };
  }
}

/**
 * Fetches menu from the school website
 * Gets the accessible menu URL by following the PDF download redirect
 */
async function fetchMenu() {
  try {
    const baseUrl = 'https://cusdk8nutrition.com/index.php?sid=1805092039571289&page=menus';

    console.log('Fetching menu page from:', baseUrl);
    const response = await axios.get(baseUrl);
    const $ = cheerio.load(response.data);

    // Find PDF links for breakfast and lunch with context
    const pdfLinks = [];
    $('a[href*="downloadMenu.php"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();

      // Get context from previous sibling (section heading)
      const parent = $(elem).parent();
      const prevSibling = parent.prev();
      const context = prevSibling.text().trim();

      pdfLinks.push({ url: href, text, context });
    });

    console.log('Found PDF links:', pdfLinks.length);

    const today = new Date();
    const todayKey = buildDateKey(today);
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Find breakfast link for elementary school
    const breakfastLink = pdfLinks.find(link =>
      link.text.toLowerCase().includes('breakfast') &&
      link.context.toLowerCase().includes('elementary')
    );

    // Find lunch link for elementary school (not McAuliffe)
    const lunchLink = pdfLinks.find(link =>
      link.text.toLowerCase().includes('lunch') &&
      link.context.toLowerCase().includes('elementary') &&
      !link.text.toLowerCase().includes('mcauliffe')
    );

    let breakfastMenuUrl = null;
    let lunchMenuUrl = null;

    // Follow redirects to get accessible menu URLs
    if (breakfastLink) {
      const fullUrl = breakfastLink.url.startsWith('http') ?
        breakfastLink.url :
        `https://cusdk8nutrition.com${breakfastLink.url}`;

      try {
        const redirectResponse = await axios.get(fullUrl, {
          maxRedirects: 0,
          validateStatus: () => true
        });

        if (redirectResponse.status === 302 && redirectResponse.headers.location) {
          breakfastMenuUrl = redirectResponse.headers.location;
          console.log('Found breakfast menu URL:', breakfastMenuUrl);
        }
      } catch (error) {
        console.error('Error following breakfast redirect:', error.message);
      }
    }

    if (lunchLink) {
      const fullUrl = lunchLink.url.startsWith('http') ?
        lunchLink.url :
        `https://cusdk8nutrition.com${lunchLink.url}`;

      try {
        const redirectResponse = await axios.get(fullUrl, {
          maxRedirects: 0,
          validateStatus: () => true
        });

        if (redirectResponse.status === 302 && redirectResponse.headers.location) {
          lunchMenuUrl = redirectResponse.headers.location;
          console.log('Found lunch menu URL:', lunchMenuUrl);
        }
      } catch (error) {
        console.error('Error following lunch redirect:', error.message);
      }
    }

    const notes = [];

    const { items: breakfastItems, error: breakfastError } = await fetchMenuItemsForUrl(
      breakfastMenuUrl,
      todayKey,
      'Breakfast'
    );
    if (breakfastError) {
      notes.push(breakfastError);
    }

    const { items: lunchItems, error: lunchError } = await fetchMenuItemsForUrl(
      lunchMenuUrl,
      todayKey,
      'Lunch'
    );
    if (lunchError) {
      notes.push(lunchError);
    }

    const fallbackNote = (!breakfastItems.length && !lunchItems.length && notes.length === 0)
      ? 'Menu items were not published for today. Please check the school website for the latest information.'
      : null;

    return {
      date: dateStr,
      breakfast: breakfastItems,
      lunch: lunchItems,
      breakfastUrl: breakfastMenuUrl,
      lunchUrl: lunchMenuUrl,
      note: notes.length ? notes.join(' ') : fallbackNote
    };
  } catch (error) {
    console.error('Error fetching menu:', error.message);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      date: dateStr,
      breakfast: [],
      lunch: [],
      breakfastUrl: null,
      lunchUrl: null,
      note: 'Unable to automatically fetch menu. Please visit the school website.'
    };
  }
}

/**
 * Formats and sends email to multiple recipients
 */
async function sendMenuEmail(menu) {
  // Support multiple recipients
  const recipients = process.env.RECIPIENT_EMAIL.split(',').map(email => email.trim());
  const renderMenuList = items => {
    if (!Array.isArray(items) || items.length === 0) {
      return '<p>Menu not available</p>';
    }
    const listItems = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    return `<ul>${listItems}</ul>`;
  };

  const breakfastListHtml = renderMenuList(menu.breakfast);
  const lunchListHtml = renderMenuList(menu.lunch);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #04538A;
          border-bottom: 3px solid #04538A;
          padding-bottom: 10px;
        }
        h2 {
          color: #0668B3;
          margin-top: 25px;
          margin-bottom: 15px;
        }
        .menu-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .menu-button {
          display: inline-block;
          background: #04538A;
          color: white !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 10px 5px;
        }
        .menu-button:hover {
          background: #0668B3;
        }
        .main-link {
          background: #28a745;
          text-align: center;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .main-link a {
          color: white !important;
          text-decoration: none;
          font-size: 18px;
          font-weight: bold;
        }
        .date {
          color: #666;
          font-style: italic;
          margin-bottom: 20px;
        }
        .note {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #888;
          text-align: center;
        }
        a {
          color: #04538A;
        }
      </style>
    </head>
    <body>
      <h1>🍽️ Today's School Menu</h1>
      <p class="date">${escapeHtml(menu.date)}</p>

      ${menu.note ? `<div class="note">📌 ${escapeHtml(menu.note)}</div>` : ''}

      <div class="menu-section">
        <h2>🥞 Breakfast Menu</h2>
        ${breakfastListHtml}
        ${menu.breakfastUrl ?
          `<p style="font-size: 12px; color: #666; margin-top: 10px;">
             Direct link: <a href="${escapeHtml(menu.breakfastUrl)}" style="word-break: break-all;">${escapeHtml(menu.breakfastUrl)}</a>
           </p>` :
          ''
        }
      </div>

      <div class="menu-section">
        <h2>🍕 Lunch Menu</h2>
        ${lunchListHtml}
        ${menu.lunchUrl ?
          `<p style="font-size: 12px; color: #666; margin-top: 10px;">
             Direct link: <a href="${escapeHtml(menu.lunchUrl)}" style="word-break: break-all;">${escapeHtml(menu.lunchUrl)}</a>
           </p>` :
          ''
        }
      </div>

      <div class="main-link">
        <a href="https://cusdk8nutrition.com/index.php?sid=1805092039571289&page=menus">
          🌐 View All Menus on School Website
        </a>
      </div>

      <div class="footer">
        <p>This is an automated notification from School Menu Notifier</p>
        <p>Menu source: <a href="https://cusdk8nutrition.com">CU School District Nutrition Services</a></p>
        <p>Accessible menus: <a href="https://www.schoolnutritionandfitness.com/webmenus2/">schoolnutritionandfitness.com</a></p>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"School Menu Notifier" <${process.env.GMAIL_USER}>`,
    to: recipients.join(', '),
    subject: `Today's School Menu - ${menu.date}`,
    html: html
  };

  console.log('Sending email to:', recipients.join(', '));
  const result = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully to all recipients!');
  return result;
}

/**
 * Cloud Function entry point
 */
functions.http('sendDailyMenu', async (req, res) => {
  try {
    console.log('Starting daily menu function...');

    // Fetch menu
    const menu = await fetchMenu();
    console.log('Menu fetched:', JSON.stringify(menu, null, 2));

    // Send email
    await sendMenuEmail(menu);

    res.status(200).json({
      success: true,
      message: 'Menu email sent successfully',
      menu: menu
    });
  } catch (error) {
    console.error('Error in function:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
