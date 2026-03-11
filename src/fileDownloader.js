import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * Downloads a file from a URL and saves it to the specified directory.
 * Returns the local filename.
 */
export async function downloadFile(fileUrl, baseDir, subfolder = '') {
    const targetDir = subfolder ? path.join(baseDir, subfolder) : baseDir;
    await fs.ensureDir(targetDir);

    // Parse the URL and create a safe filename
    const parsedUrl = new URL(fileUrl);
    let filename = path.basename(parsedUrl.pathname);

    // Clean up filename — remove query params and ensure a valid name
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!filename || filename === '_') {
        filename = `file_${Date.now()}${getExtension(parsedUrl.pathname)}`;
    }

    // If the file already exists, just return the name (no need to re-download)
    const targetPath = path.join(targetDir, filename);
    if (await fs.pathExists(targetPath)) {
        return filename;
    }

    const finalPath = path.join(targetDir, filename);

    return new Promise((resolve, reject) => {
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const request = protocol.get(fileUrl, { timeout: 30000 }, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location, baseDir, subfolder)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode} for ${fileUrl}`));
                return;
            }

            const fileStream = fs.createWriteStream(finalPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve(filename);
            });

            fileStream.on('error', (err) => {
                fs.unlink(finalPath).catch(() => { });
                reject(err);
            });
        });

        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error(`Timeout downloading ${fileUrl}`));
        });
    });
}

function getExtension(pathname) {
    const ext = path.extname(pathname);
    return ext || '.bin';
}
