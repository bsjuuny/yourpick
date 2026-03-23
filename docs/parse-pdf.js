const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const fs = require('fs');

async function main() {
    const data = new Uint8Array(fs.readFileSync('docs/cpmsapi030_spec.pdf'));
    const doc = await pdfjsLib.getDocument({ data }).promise;

    let allText = '';
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        allText += `\n--- PAGE ${i} ---\n`;
        allText += strings.join(' ') + '\n';
    }

    fs.writeFileSync('docs/cpmsapi030_spec.txt', allText, 'utf8');
    console.log('Pages:', doc.numPages);
    console.log('Saved to docs/cpmsapi030_spec.txt');
}
main().catch(console.error);
