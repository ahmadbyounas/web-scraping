import { createObjectCsvWriter } from 'csv-writer';

/**
 * Exports an array of company data objects to a CSV file
 * matching the predefined template structure.
 */
export async function exportToCsv(data, outputPath) {
    const csvWriter = createObjectCsvWriter({
        path: outputPath,
        header: [
            { id: 'name', title: 'name' },
            { id: 'riskIndicator', title: 'riskIndicator' },
            { id: 'pdfs', title: 'pdfs' },
            { id: 'pictures', title: 'pictures' },
            { id: 'summary', title: 'summary' },
            { id: 'description', title: 'description' },
            { id: 'country', title: 'country' },
            { id: 'alias', title: 'alias' },
            { id: 'previousName', title: 'previousName' },
            { id: 'weakAlias', title: 'weakAlias' },
            { id: 'tags', title: 'tags' },
            { id: 'address', title: 'address' },
            { id: 'program', title: 'program' },
            { id: 'notes', title: 'notes' },
            { id: 'email', title: 'email' },
            { id: 'phone', title: 'phone' },
            { id: 'website', title: 'website' },
            { id: 'source name', title: 'source name' },
            { id: 'source link', title: 'source link' },
        ],
        encoding: 'utf8',
    });

    // Clean data before writing
    const cleanedData = data.map((record) => {
        const cleaned = {};
        for (const [key, value] of Object.entries(record)) {
            if (typeof value === 'string') {
                // Remove excessive whitespace and line breaks
                cleaned[key] = value
                    .replace(/\r?\n/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
            } else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    });

    await csvWriter.writeRecords(cleanedData);
    console.log(`  Written ${cleanedData.length} records to ${outputPath}`);
}
