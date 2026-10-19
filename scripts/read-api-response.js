/** Decode after joining chunks: a Korean UTF-8 character can cross TCP chunks. */
function readApiResponse(response) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('error', reject);
        response.on('aborted', () => reject(new Error('API response aborted')));
        response.on('end', () => {
            if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
                reject(new Error(`API HTTP ${response.statusCode}`));
                return;
            }
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
    });
}
module.exports = { readApiResponse };
