/**
 * Scrapes company URLs.
 * Assumes the user has already navigated to the starting page and solved any challenge.
 */
export async function scrapeCompanyList(page, baseUrl, maxCompanies) {
  const companyUrls = [];
  let pageNum = 1;

  while (companyUrls.length < maxCompanies) {
    // Collect links from CURRENT page
    const links = await page.evaluate((base) => {
      const anchors = document.querySelectorAll('.company-index__result a[href*="/en/companies/"], .company-index__results a[href*="/en/companies/"]');
      const allAnchors = anchors.length > 0 ? Array.from(anchors) : Array.from(document.querySelectorAll('a[href*="/en/companies/"]'));
      
      const urls = [];
      const seen = new Set();
      allAnchors.forEach((a) => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('/en/companies/') && href !== '/en/companies/' && !href.includes('#') && !href.includes('?')) {
          const fullUrl = new URL(href, base).href;
          if (!seen.has(fullUrl)) {
            seen.add(fullUrl);
            urls.push(fullUrl);
          }
        }
      });
      return urls;
    }, baseUrl);

    // Add unique links
    const existingSet = new Set(companyUrls);
    for (const link of links) {
      if (!existingSet.has(link) && companyUrls.length < maxCompanies) {
        companyUrls.push(link);
        existingSet.add(link);
      }
    }

    console.log(`  Page ${pageNum}: Collected ${links.length} links. (Total: ${companyUrls.length})`);

    if (companyUrls.length >= maxCompanies) break;

    // Navigate to next page
    pageNum++;
    const nextUrl = `${baseUrl}/en/companies/?page=${pageNum}#company_index_form`;
    
    try {
      await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Short wait for the list to render
      await page.waitForSelector('.company-index__result, a[href*="/en/companies/"]', { timeout: 10000 }).catch(() => {});
    } catch (err) {
      console.log(`  End of list or error loading next page ${pageNum}.`);
      break;
    }
  }

  return companyUrls;
}

/**
 * Identifies the total number of companies by looking at pagination.
 */
export async function getTotalCompanyCount(page, baseUrl) {
  try {
    const listingUrl = `${baseUrl}/en/companies/`;
    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for pagination or content
    await page.waitForSelector('.pagination, .company-index__result', { timeout: 15000 });

    const total = await page.evaluate(() => {
      const paginationItems = document.querySelectorAll('.pagination .page-item');
      if (paginationItems.length === 0) return 24; // If no pagination, assume at least 1 page

      // Find the last numerical page link
      let maxPage = 1;
      paginationItems.forEach(item => {
        const pageNum = parseInt(item.innerText.trim());
        if (!isNaN(pageNum) && pageNum > maxPage) {
          maxPage = pageNum;
        }
      });

      // Usually 24 items per page on this site
      return maxPage * 24; 
    });

    return total;
  } catch (err) {
    console.error('  ⚠️ Could not determine total count automatically. Using fallback.');
    return 20000; // Fallback based on intro text
  }
}
