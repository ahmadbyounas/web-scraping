import { downloadFile } from './fileDownloader.js';

/**
 * Scrapes a single company detail page and returns data mapped to CSV columns.
 * Uses BEM-style class selectors and SVG icon detection specific to the BHRC site.
 */
export async function scrapeCompanyDetail(page, url, downloadsDir) {
    // Use a shorter timeout for individual pages to avoid hanging
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    } catch (err) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Wait for the company name or meta list to appear
    try {
        await page.waitForSelector('.company__name, .company__meta-list, h1', { timeout: 10000 });
    } catch {
        // Try to wait a bit more
        await new Promise(r => setTimeout(r, 2000));
    }

    const data = await page.evaluate(() => {
        const SEPARATOR = ' ||| ';

        // --- Company Name ---
        // Research showed the name is in .company__name
        const nameEl = document.querySelector('.company__name');
        const name = nameEl ? nameEl.innerText.trim() : document.querySelector('h1')?.innerText.trim() || '';

        // If the name gathered is just the site name, it's likely a failure
        const sanitizedName = (name === 'Business and Human Rights Centre' || name === 'Business & Human Rights Resource Centre') ? '' : name;

        // --- Meta fields (sector, country, website) ---
        // Icons are SVGs with <use> tags referencing sprite IDs like #industry, #map-pin, #globe
        const metaItems = document.querySelectorAll('.company__meta-list-item');

        const sectors = [];
        const countries = [];
        let website = '';

        metaItems.forEach((item) => {
            const svgUse = item.querySelector('svg use');
            const href = svgUse ? (svgUse.getAttribute('href') || svgUse.getAttribute('xlink:href') || '') : '';

            if (href.includes('industry') || href.includes('building')) {
                const text = item.innerText.trim();
                if (text) sectors.push(text);
            } else if (href.includes('map-pin') || href.includes('map-marker') || href.includes('flag')) {
                const text = item.innerText.trim();
                if (text) countries.push(text);
            } else if (href.includes('globe') || href.includes('link') || href.includes('external') || href.includes('web')) {
                const link = item.querySelector('a');
                if (link) {
                    website = link.href || link.innerText.trim();
                }
            }
        });

        // --- Tags (Associated top issues) ---
        const tagEls = document.querySelectorAll('.company__top-issue, .company-associated-issues__item');
        const tags = [];
        const seenTags = new Set();
        tagEls.forEach((el) => {
            const link = el.querySelector('a');
            const text = link ? link.innerText.trim() : el.innerText.trim();
            if (text && !seenTags.has(text)) {
                seenTags.add(text);
                tags.push(text);
            }
        });

        // --- Indicators (Response Rate, Allegations, etc.) ---
        const indicators = [];
        const indicatorEls = document.querySelectorAll('.company__indicator');
        indicatorEls.forEach((el) => {
            const value = el.querySelector('.company__indicator-value, h3');
            const label = el.querySelector('.company__indicator-label, p, span');
            if (value && label) {
                const v = value.innerText.trim();
                const l = label.innerText.trim();
                if (v && l && v !== 'N/A') {
                    indicators.push(`${l}: ${v}`);
                }
            }
        });

        // --- Summary / Description ---
        let summary = '';
        const newsLink = document.querySelector(
            '.company-dashboard__latest-news a, [class*="latest-news"] a, .news-list a'
        );
        if (newsLink) {
            summary = newsLink.innerText.trim();
        }

        // Try to find a description section if it exists
        let description = '';
        const descEl = document.querySelector('.company__description, .company-dashboard__from-bhrc');
        if (descEl) {
            description = descEl.innerText.trim();
        }

        // --- PDF links ---
        const pdfLinks = [];
        document.querySelectorAll('a[href$=".pdf"]').forEach((a) => {
            const href = a.href;
            if (href && !pdfLinks.includes(href)) {
                pdfLinks.push(href);
            }
        });

        // --- Image links (company-related) ---
        const imageLinks = [];
        document.querySelectorAll('img').forEach((img) => {
            const src = img.src || '';
            if (
                src &&
                !src.includes('logo') &&
                !src.includes('icon') &&
                !src.includes('favicon') &&
                !src.includes('tracking') &&
                !src.includes('pixel') &&
                !src.includes('facebook') &&
                !src.includes('twitter') &&
                !src.includes('linkedin') &&
                !src.includes('instagram') &&
                !src.includes('youtube') &&
                !src.includes('social') &&
                !src.includes('placeholder') &&
                !src.includes('data:image') &&
                !src.includes('svg') &&
                img.naturalWidth > 100 && // Increase size threshold to ignore small UI glpyhs
                img.naturalHeight > 100
            ) {
                if (!imageLinks.includes(src)) {
                    imageLinks.push(src);
                }
            }
        });

        return {
            name: sanitizedName,
            sectors: sectors.join(SEPARATOR),
            countries: countries.join(SEPARATOR),
            website,
            tags: tags.join(SEPARATOR),
            notes: indicators.join(SEPARATOR),
            description,
            summary,
            pdfLinks,
            imageLinks,
        };
    });

    // Only download if we actually got a company name (sanity check)
    if (!data.name) {
        throw new Error('Failed to extract company name. Page might be blocked or malformed.');
    }

    // Download PDFs and images
    const downloadedPdfs = [];
    for (const pdfUrl of data.pdfLinks || []) {
        try {
            const filename = await downloadFile(pdfUrl, downloadsDir, 'pdfs');
            downloadedPdfs.push(filename);
        } catch (err) {
            // Non-fatal
        }
    }

    const downloadedImages = [];
    for (const imgUrl of data.imageLinks || []) {
        try {
            const filename = await downloadFile(imgUrl, downloadsDir, 'images');
            downloadedImages.push(filename);
        } catch (err) {
            // Non-fatal
        }
    }

    // Map to CSV columns
    return {
        name: data.name,
        riskIndicator: data.sectors || '',
        pdfs: downloadedPdfs.join(' ||| '),
        pictures: downloadedImages.join(' ||| '),
        summary: data.summary || '',
        description: data.description || '',
        country: data.countries || '',
        alias: '',
        previousName: '',
        weakAlias: '',
        tags: data.tags || '',
        address: '',
        program: '',
        notes: data.notes || '',
        email: '',
        phone: '',
        website: data.website || '',
        'source name': 'Business & Human Rights Resource Centre',
        'source link': url,
    };
}
