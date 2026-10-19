/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const fs = require('node:fs');
const path = require('node:path');
const { validateInstitutions, parseCoordinate, contains } = require('./geo/validate-coordinates');
const boundaries = require('./geo/municipalities.json');

function auditDirectory(dataDir, { write = false, reportPath } = {}) {
    const files = fs.readdirSync(dataDir).filter(f => /^\d{2}_\d{5}(?:_childcare)?\.json$/.test(f)).sort();
    const entries = files.map(file => ({ file, records: JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) }));
    // A single nationwide pass detects duplicates across files and institution types.
    // The file name is the collection scope: never trust a record's self-declared region.
    const all = entries.flatMap(e => e.records.map(r => ({ ...r,
        sidoCode: e.file.slice(0, 2), sggCode: e.file.slice(3, 8) })));
    const { institutions, duplicates } = validateInstitutions(all);
    const issues = [], bySource = {}, reasons = {};
    let offset = 0, changedFiles = 0;
    for (const entry of entries) {
        const records = institutions.slice(offset, offset + entry.records.length);
        offset += records.length;
        for (const record of records) {
            bySource[record.source] ??= { total: 0, regionConsistent: 0, unconfirmed: 0 };
            bySource[record.source].total++;
            bySource[record.source][record.locationStatus === 'unconfirmed' ? 'unconfirmed' : 'regionConsistent']++;
            if (record.locationStatus === 'unconfirmed') {
                for (const reason of record.locationIssues) reasons[reason] = (reasons[reason] || 0) + 1;
                issues.push({ file: entry.file, id: record.id, source: record.source, name: record.name, address: record.address,
                    sourceCoordinates: record.sourceCoordinates, reasons: record.locationIssues,
                    coordinateRegions: Object.entries(boundaries).filter(([, boundary]) => {
                        const lat = parseCoordinate(record.sourceCoordinates.latitude);
                        const lng = parseCoordinate(record.sourceCoordinates.longitude);
                        return lat !== null && lng !== null && contains(boundary, lat, lng);
                    }).map(([code, boundary]) => ({ code, name: boundary.name })) });
            }
        }
        const output = JSON.stringify(records, null, 2);
        if (fs.readFileSync(path.join(dataDir, entry.file), 'utf8') !== output) {
            changedFiles++;
            if (write) fs.writeFileSync(path.join(dataDir, entry.file), output);
        }
    }
    const report = { schemaVersion: 1, boundarySnapshot: '2025-04-01',
        scope: { files: files.length, provinces: new Set(all.map(r => r.sidoCode)).size, municipalities: new Set(all.map(r => r.sggCode)).size },
        total: all.length, regionConsistent: all.length - issues.length, unconfirmed: issues.length, bySource, reasons,
        duplicateGroups: duplicates.length, suspiciousDuplicateGroups: duplicates.filter(g => g.classification !== 'shared_building').length,
        issues, duplicates };
    if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    return { report, changedFiles };
}

if (require.main === module) {
    const { report, changedFiles } = auditDirectory(path.resolve(__dirname, '../public/data'), {
        write: process.argv.includes('--write'),
        reportPath: process.argv.includes('--write') ? path.resolve(__dirname, '../docs/coordinate-audit.json') : undefined,
    });
    console.log(JSON.stringify({ ...report, issues: undefined, duplicates: undefined, changedFiles }, null, 2));
    if (process.argv.includes('--check') && changedFiles) process.exitCode = 1;
}
module.exports = { auditDirectory };
