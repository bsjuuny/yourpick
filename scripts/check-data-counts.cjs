/* eslint-disable @typescript-eslint/no-require-imports -- Node.js data verification entry point. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// A changed region code makes the public APIs answer "no results" instead of an
// error (2026-07: Incheon districts, Jeonnam-Gwangju merger). The collector then
// writes an empty kindergarten file or keeps an old childcare file. Compare
// facility counts with the last committed data so a refresh cannot quietly
// empty a region.
const MIN_RATIO = 0.7;        // a region with 10+ facilities may not lose 30%+
const MIN_TOTAL_RATIO = 0.95; // the whole data set may not lose 5%+

function regionFiles(regions) {
    return regions.flatMap(sido => sido.sggList.flatMap(sgg =>
        ['', '_childcare'].map(suffix => `${sido.sidoCode}_${sgg.sggCode}${suffix}.json`)));
}

function compareCounts(current, baseline) {
    const problems = [];
    let currentTotal = 0;
    let baselineTotal = 0;
    for (const [file, now] of Object.entries(current)) {
        const before = baseline[file];
        currentTotal += now;
        if (before === undefined) continue;
        baselineTotal += before;
        if (before > 0 && now === 0) problems.push(`${file}: ${before} → 0`);
        else if (before >= 10 && now < before * MIN_RATIO) problems.push(`${file}: ${before} → ${now}`);
    }
    for (const [file, now] of Object.entries(current)) {
        if (baseline[file] === undefined && now === 0) problems.push(`${file}: new region with 0 facilities`);
    }
    if (baselineTotal > 0 && currentTotal < baselineTotal * MIN_TOTAL_RATIO) {
        problems.push(`total: ${baselineTotal} → ${currentTotal}`);
    }
    return { problems, currentTotal, baselineTotal };
}

function readCount(text) {
    const list = JSON.parse(text);
    return Array.isArray(list) ? list.length : 0;
}

function countsAtRef(root, ref, files) {
    const counts = {};
    for (const file of files) {
        try {
            counts[file] = readCount(execFileSync('git', ['show', `${ref}:public/data/${file}`],
                { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
        } catch { /* not in the baseline: a new region */ }
    }
    return counts;
}

// 수집이 안 된 지역을 채우던 자리표시 기관(예: 2026-03 여주시 "어린이집 1", 주소 미상)을 막는다.
function isPlaceholder(inst) {
    return /^(어린이집|유치원) \d+$/.test(String(inst.name || ''))
        || String(inst.address || '').trim() === '주소 미상'
        || /^\d{1,3}$/.test(String(inst.id || ''));
}

module.exports = { compareCounts, regionFiles, isPlaceholder };

if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    const ref = process.argv[2] || 'HEAD';
    const dataDir = path.join(root, 'public/data');
    const files = regionFiles(JSON.parse(fs.readFileSync(path.join(dataDir, 'regions.json'), 'utf8')));
    const current = {};
    for (const file of files) {
        const fullPath = path.join(dataDir, file);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Missing data file for a listed region: ${file}`);
            process.exit(1);
        }
        const text = fs.readFileSync(fullPath, 'utf8');
        current[file] = readCount(text);
        const placeholders = JSON.parse(text).filter(isPlaceholder);
        if (placeholders.length > 0) {
            console.error(`❌ Placeholder institutions in ${file}: ${placeholders.slice(0, 3).map(p => `${p.id} ${p.name}`).join(', ')}`);
            process.exit(1);
        }
    }
    const { problems, currentTotal, baselineTotal } = compareCounts(current, countsAtRef(root, ref, files));
    if (problems.length > 0) {
        console.error(`❌ Facility counts dropped compared with ${ref}:`);
        for (const line of problems) console.error(`   ${line}`);
        process.exit(1);
    }
    console.log(`✅ Facility counts OK: ${baselineTotal} → ${currentTotal} (${ref})`);
}
