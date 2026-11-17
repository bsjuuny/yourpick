/* eslint-disable @typescript-eslint/no-require-imports -- Node.js build verification entry point. */
const fs = require('node:fs');
const path = require('node:path');

// U+FFFD in the data means a response was decoded in pieces and a Korean
// character was split across network chunks. The original text is lost, so
// stop before such data is committed or built.
const REPLACEMENT_CHAR = '�';

function findBrokenText(dataDir) {
    const broken = [];
    for (const name of fs.readdirSync(dataDir).filter(file => file.endsWith('.json')).sort()) {
        const text = fs.readFileSync(path.join(dataDir, name), 'utf8');
        let count = 0;
        let sample = '';
        for (let index = text.indexOf(REPLACEMENT_CHAR); index !== -1; index = text.indexOf(REPLACEMENT_CHAR, index + 1)) {
            if (count === 0) sample = text.slice(Math.max(0, index - 15), index + 15).replace(/\s+/g, ' ');
            count++;
        }
        if (count > 0) broken.push({ file: name, count, sample });
    }
    return broken;
}

module.exports = { findBrokenText };

if (require.main === module) {
    const dataDir = path.resolve(process.argv[2] || path.join(__dirname, '../public/data'));
    const broken = findBrokenText(dataDir);
    if (broken.length > 0) {
        const total = broken.reduce((sum, item) => sum + item.count, 0);
        console.error(`❌ Broken characters (U+FFFD) in ${broken.length} data files, ${total} places:`);
        for (const item of broken.slice(0, 10)) console.error(`   ${item.file}: ${item.count} — ${item.sample}`);
        process.exit(1);
    }
    console.log(`✅ No broken characters in ${dataDir}`);
}
