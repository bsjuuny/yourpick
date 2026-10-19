/* eslint-disable @typescript-eslint/no-require-imports -- Node.js build verification entry point. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Check the actual deployable output: unit tests alone cannot catch a missing
// NEXT_PUBLIC_BASE_PATH on the machine that builds the Cafe24 upload.
const root = path.resolve(__dirname, '../out');
const basePath = '/yourpick';
for (const page of ['index.html', 'list/index.html', 'compare/index.html', 'ranking/index.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="([^"?#]+\.(?:css|js))(?:[?#][^"]*)?"/g)].map(match => match[1]);
    assert.ok(assets.some(asset => asset.endsWith('.css')), `${page}: missing stylesheet`);
    assert.ok(assets.some(asset => asset.endsWith('.js')), `${page}: missing scripts`);
    for (const asset of assets) {
        assert.ok(asset.startsWith(`${basePath}/`), `${page}: asset outside deployment prefix: ${asset}`);
        assert.ok(fs.existsSync(path.join(root, asset.slice(basePath.length + 1))), `${page}: missing asset: ${asset}`);
    }
}

function checkChunks(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) checkChunks(file);
        else if (entry.name.endsWith('.js')) {
            const code = fs.readFileSync(file, 'utf8');
            assert.ok(!code.includes('NEXT_PUBLIC_BASE_PATH'), `${file}: deployment prefix was not inlined`);
        }
    }
}
checkChunks(path.join(root, '_next/static/chunks'));

const regions = JSON.parse(fs.readFileSync(path.join(root, 'data/regions.json'), 'utf8'));
assert.ok(regions.length > 0, 'empty region list');
let institutionCount = 0;
let regionCount = 0;
for (const region of regions) {
    for (const district of region.sggList) {
        regionCount++;
        for (const suffix of ['', '_childcare']) {
            const name = `${region.sidoCode}_${district.sggCode}${suffix}.json`;
            const institutions = JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
            assert.ok(Array.isArray(institutions), `invalid institution list: ${name}`);
            institutionCount += institutions.length;
        }
    }
}
const ranking = JSON.parse(fs.readFileSync(path.join(root, 'data/region-ranking.json'), 'utf8'));
assert.equal(ranking.regionCount, regionCount, 'ranking and search region counts differ');
assert.ok(institutionCount > 0, 'empty institution data');
console.log(`Static export verified: 4 pages, ${regionCount} regions, ${institutionCount} institutions.`);
