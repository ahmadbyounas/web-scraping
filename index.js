import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeCompanyList, getTotalCompanyCount } from './src/scrapeCompanyList.js';
import { scrapeCompanyDetail } from './src/scrapeCompanyDetail.js';
import { exportToCsv } from './src/csvExporter.js';
import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';

// Enable stealth mode
puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.business-humanrights.org';
const MAX_COMPANIES = 50;
const DOWNLOADS_DIR = path.resolve('downloads', 'business-humanrights.org');
const OUTPUT_DIR = path.resolve('output');

// Utility for manual confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('🚀 Starting "Hardened" Business & Human Rights Web Scraper...');
  console.log('--------------------------------------------------\n');

  await fs.ensureDir(DOWNLOADS_DIR);
  await fs.ensureDir(OUTPUT_DIR);

  console.log('🧪 STRATEGY: Using real Chrome + Automation masking.');
  console.log('1. A Chrome window will open.');
  console.log('2. If you see Cloudflare, solve it manually.');
  console.log('3. ONCE YOU SEE THE COMPANY LIST, press ENTER in this terminal.');
  console.log('--------------------------------------------------\n');

  // Path to REAL Chrome on your Windows system
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    ignoreDefaultArgs: ['--enable-automation'], // CRITICAL: Hides automation from Cloudflare
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
    ],
    defaultViewport: null,
  });

  try {
    const pages = await browser.pages();
    const page = pages[0];

    // Navigate to listing
    console.log(`📋 Loading listing page: ${BASE_URL}/en/companies/`);
    await page.goto(`${BASE_URL}/en/companies/`, { waitUntil: 'domcontentloaded' });

    console.log('\n⚠️ ACTION REQUIRED:');
    console.log('  - In the Chrome window, solve any "Verify you are human" challenge.');
    console.log('  - When the list of companies is visible, come back here.');
    await askQuestion('  - PRESS [ENTER] HERE TO PROCEED...');

    // Identify total
    console.log('\n📊 Identifying total companies available...');
    const totalAvailable = await getTotalCompanyCount(page, BASE_URL);
    console.log(`   Found approximately ${totalAvailable} companies.`);

    const userInput = await askQuestion(`\n❓ How many companies would you like to scrape? (Max: ${totalAvailable}, Default: 50): `);
    const limit = parseInt(userInput) || 50;
    const finalLimit = Math.min(limit, totalAvailable);

    // Step 1: Collect company URLs
    console.log(`\n🔍 Scanning for first ${finalLimit} company URLs...`);
    const companyUrls = await scrapeCompanyList(page, BASE_URL, finalLimit);
    
    if (companyUrls.length === 0) {
      throw new Error('No company URLs found. Make sure you are on the company list page.');
    }

    console.log(`\n✅ Collected ${companyUrls.length} URLs.\n`);

    // Step 2: Extract data
    const results = [];
    for (let i = 0; i < companyUrls.length; i++) {
      const url = companyUrls[i];
      console.log(`  [${i + 1}/${companyUrls.length}] Scraping: ${url}`);

      try {
        const data = await scrapeCompanyDetail(page, url, DOWNLOADS_DIR);
        results.push(data);
        console.log(`    ✓ Extracted: ${data.name}`);
      } catch (err) {
        console.error(`    ✗ Error: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
    }

    // Step 3: Save to CSV
    if (results.length > 0) {
      const outputPath = path.join(OUTPUT_DIR, 'companies.csv');
      console.log(`💾 Saving ${results.length} results to ${outputPath}...`);
      try {
        await exportToCsv(results, outputPath);
        console.log('✅ CSV Exported successfully!');
      } catch (err) {
        if (err.code === 'EBUSY') {
          console.error(`\n❌ ERROR: The file ${outputPath} is open in another program (like Excel or your code editor).`);
          console.error('   Please close the file and run "npm start" again.');
        } else {
          throw err;
        }
      }
    }

    console.log('\n🏁 Finished. You can now close the browser.');
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
  } finally {
    rl.close();
    console.log('\nClosing browser in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close().catch(() => {});
  }
}

main();
