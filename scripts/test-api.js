/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const http = require('http');

const API_KEY = process.env.CHILDCARE_API_KEY?.trim();
if (!API_KEY) {
    console.error('CHILDCARE_API_KEY is required.');
    process.exit(1);
}
const SGG_CODE = '11110'; // 종로구

const url = `http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=${API_KEY}&arcode=${SGG_CODE}`;

http.get(url, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response data (first 500 chars):', data.substring(0, 500));
    });
}).on('error', () => {
    console.error('Childcare API request failed.');
    process.exitCode = 1;
});
