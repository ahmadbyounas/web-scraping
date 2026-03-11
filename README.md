# Business & Human Rights Web Scraper

A robust Node.js Puppeteer scraper designed to extract company data from `business-humanrights.org` and export it to a template-compliant CSV.

## Features
- **Cloudflare Bypass**: Uses real Chrome integration and automation masking to pass security challenges.
- **Template Compliant**: Generates a 19-column CSV matching the provided requirement.
- **Multi-value Handling**: Automatically combines multiple countries, sectors, and issues using the `|||` delimiter.
- **File Downloads**: Downloads PDFs and images into structured folders.
- **Data Cleaning**: Automatically removes excessive whitespace and line breaks.

## Prerequisites
- **Node.js**: Version 18 or higher.
- **Google Chrome**: Installed in the default Windows path (`C:\Program Files\Google\Chrome\Application\chrome.exe`).

## Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage (How to Run)
1. **Start the scraper**:
   ```bash
   npm start
   ```
2. **Solve Challenge**: A Chrome window will open. If you see a "Verify you are human" checkbox, click it manually.
3. **Confirm in Terminal**: Once you see the actual list of companies in the Chrome window, go back to your terminal and **press [ENTER]**.
4. **Processing**: The script will now automatically:
   - Collect 50 company URLs.
   - Extract detail data for each.
   - Download files to `downloads/business-humanrights.org/`.
   - Save the results to `output/companies.csv`.

## Output Structure
- **`output/companies.csv`**: The final structured data.
- **`downloads/business-humanrights.org/`**: Contains subfolders for `pdfs` and `images`.

## Requirements Compliance
- **Node.js + Puppeteer**: Yes.
- **19-Column CSV**: Yes.
- **Delimiter `|||`**: Yes (used for sectors, countries, tags, notes, pdfs, and pictures).
- **Test Scope**: Configured for 50 companies (adjustable in `index.js`).
