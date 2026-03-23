const http = require('http');

const API_KEY = 'd1527485ec3f4580996f66f20447dafe'; 
const SGG_CODE = '11110'; // 종로구

const url = `http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=${API_KEY}&arcode=${SGG_CODE}`;

http.get(url, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response data (first 500 chars):', data.substring(0, 500));
    });
}).on('error', (e) => {
    console.error('Error:', e.message);
});
