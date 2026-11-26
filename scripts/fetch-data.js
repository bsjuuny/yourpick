/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { validateInstitutions } = require('./geo/validate-coordinates');
const { auditDirectory } = require('./audit-coordinates');
const { readApiResponse } = require('./read-api-response');
const { loadApiEnvironment, parseSourceSelection } = require('./api-environment');
const { classifyChildcareResponse, runPreflight } = require('./data-preflight');
const { compareCounts, regionFiles, unavailableChildcareFiles, isPlaceholder } = require('./check-data-counts.cjs');
const { findBrokenText } = require('./check-data-encoding.cjs');

const API_CONFIG = loadApiEnvironment();
const API_KEY = API_CONFIG.kindergartenKey;
const CHILDCARE_API_KEY = API_CONFIG.childcareKey;

// 휴대전화 번호(010/011/016/017/018/019)는 가정어린이집 원장 개인 번호일 수 있어 공개 데이터에서 제외.
// 유선/대표번호(02-, 031-, 070- 등)는 그대로 유지. 누락 값은 기존 규칙대로 '-'.
const MOBILE_PHONE_RE = /(^|[^\d])\(?01[016789]\)?[-.\s)]*\d{3,4}[-.\s]*\d{4}(?!\d)/;
function sanitizePhone(value) {
    if (!value) return '-';
    return MOBILE_PHONE_RE.test(String(value)) ? '-' : value;
}

const REGIONS = [
    {
        "sidoCode": "11",
        "sidoName": "서울특별시",
        "sggList": [
            { "sggCode": "11110", "sggName": "종로구" },
            { "sggCode": "11140", "sggName": "중구" },
            { "sggCode": "11170", "sggName": "용산구" },
            { "sggCode": "11200", "sggName": "성동구" },
            { "sggCode": "11215", "sggName": "광진구" },
            { "sggCode": "11230", "sggName": "동대문구" },
            { "sggCode": "11260", "sggName": "중랑구" },
            { "sggCode": "11290", "sggName": "성북구" },
            { "sggCode": "11305", "sggName": "강북구" },
            { "sggCode": "11320", "sggName": "도봉구" },
            { "sggCode": "11350", "sggName": "노원구" },
            { "sggCode": "11380", "sggName": "은평구" },
            { "sggCode": "11410", "sggName": "서대문구" },
            { "sggCode": "11440", "sggName": "마포구" },
            { "sggCode": "11470", "sggName": "양천구" },
            { "sggCode": "11500", "sggName": "강서구" },
            { "sggCode": "11530", "sggName": "구로구" },
            { "sggCode": "11545", "sggName": "금천구" },
            { "sggCode": "11560", "sggName": "영등포구" },
            { "sggCode": "11590", "sggName": "동작구" },
            { "sggCode": "11620", "sggName": "관악구" },
            { "sggCode": "11650", "sggName": "서초구" },
            { "sggCode": "11680", "sggName": "강남구" },
            { "sggCode": "11710", "sggName": "송파구" },
            { "sggCode": "11740", "sggName": "강동구" }
        ]
    },
    {
        "sidoCode": "26",
        "sidoName": "부산광역시",
        "sggList": [
            { "sggCode": "26110", "sggName": "중구" },
            { "sggCode": "26140", "sggName": "서구" },
            { "sggCode": "26170", "sggName": "동구" },
            { "sggCode": "26200", "sggName": "영도구" },
            { "sggCode": "26230", "sggName": "부산진구" },
            { "sggCode": "26260", "sggName": "동래구" },
            { "sggCode": "26290", "sggName": "남구" },
            { "sggCode": "26320", "sggName": "북구" },
            { "sggCode": "26350", "sggName": "해운대구" },
            { "sggCode": "26380", "sggName": "사하구" },
            { "sggCode": "26410", "sggName": "금정구" },
            { "sggCode": "26440", "sggName": "강서구" },
            { "sggCode": "26470", "sggName": "연제구" },
            { "sggCode": "26500", "sggName": "수영구" },
            { "sggCode": "26530", "sggName": "사상구" },
            { "sggCode": "26710", "sggName": "기장군" }
        ]
    },
    {
        "sidoCode": "27",
        "sidoName": "대구광역시",
        "sggList": [
            { "sggCode": "27110", "sggName": "중구" },
            { "sggCode": "27140", "sggName": "동구" },
            { "sggCode": "27170", "sggName": "서구" },
            { "sggCode": "27200", "sggName": "남구" },
            { "sggCode": "27230", "sggName": "북구" },
            { "sggCode": "27260", "sggName": "수성구" },
            { "sggCode": "27290", "sggName": "달서구" },
            { "sggCode": "27710", "sggName": "달성군" },
            { "sggCode": "27720", "sggName": "군위군" }
        ]
    },
    {
        "sidoCode": "28",
        "sidoName": "인천광역시",
        "sggList": [
            { "sggCode": "28125", "sggName": "제물포구" },
            { "sggCode": "28155", "sggName": "영종구" },
            { "sggCode": "28177", "sggName": "미추홀구" },
            { "sggCode": "28185", "sggName": "연수구" },
            { "sggCode": "28200", "sggName": "남동구" },
            { "sggCode": "28237", "sggName": "부평구" },
            { "sggCode": "28245", "sggName": "계양구" },
            { "sggCode": "28275", "sggName": "서해구" },
            { "sggCode": "28290", "sggName": "검단구" },
            { "sggCode": "28710", "sggName": "강화군" },
            { "sggCode": "28720", "sggName": "옹진군" }
        ]
    },
    {
        "sidoCode": "12",
        "sidoName": "전남광주통합특별시",
        "sggList": [
            { "sggCode": "12110", "sggName": "목포시" },
            { "sggCode": "12130", "sggName": "여수시" },
            { "sggCode": "12150", "sggName": "순천시" },
            { "sggCode": "12170", "sggName": "나주시" },
            { "sggCode": "12190", "sggName": "광양시" },
            { "sggCode": "12210", "sggName": "동구" },
            { "sggCode": "12240", "sggName": "서구" },
            { "sggCode": "12270", "sggName": "남구" },
            { "sggCode": "12300", "sggName": "북구" },
            { "sggCode": "12330", "sggName": "광산구" },
            { "sggCode": "12710", "sggName": "담양군" },
            { "sggCode": "12720", "sggName": "곡성군" },
            { "sggCode": "12730", "sggName": "구례군" },
            { "sggCode": "12740", "sggName": "고흥군" },
            { "sggCode": "12750", "sggName": "보성군" },
            { "sggCode": "12760", "sggName": "화순군" },
            { "sggCode": "12770", "sggName": "장흥군" },
            { "sggCode": "12780", "sggName": "강진군" },
            { "sggCode": "12790", "sggName": "해남군" },
            { "sggCode": "12800", "sggName": "영암군" },
            { "sggCode": "12810", "sggName": "무안군" },
            { "sggCode": "12820", "sggName": "함평군" },
            { "sggCode": "12830", "sggName": "영광군" },
            { "sggCode": "12840", "sggName": "장성군" },
            { "sggCode": "12850", "sggName": "완도군" },
            { "sggCode": "12860", "sggName": "진도군" },
            { "sggCode": "12870", "sggName": "신안군" }
        ]
    },
    {
        "sidoCode": "30",
        "sidoName": "대전광역시",
        "sggList": [
            { "sggCode": "30110", "sggName": "동구" },
            { "sggCode": "30140", "sggName": "중구" },
            { "sggCode": "30170", "sggName": "서구" },
            { "sggCode": "30200", "sggName": "유성구" },
            { "sggCode": "30230", "sggName": "대덕구" }
        ]
    },
    {
        "sidoCode": "31",
        "sidoName": "울산광역시",
        "sggList": [
            { "sggCode": "31110", "sggName": "중구" },
            { "sggCode": "31140", "sggName": "남구" },
            { "sggCode": "31170", "sggName": "동구" },
            { "sggCode": "31200", "sggName": "북구" },
            { "sggCode": "31710", "sggName": "울주군" }
        ]
    },
    {
        "sidoCode": "36",
        "sidoName": "세종특별자치시",
        "sggList": [
            { "sggCode": "36110", "sggName": "세종시" }
        ]
    },
    {
        "sidoCode": "41",
        "sidoName": "경기도",
        "sggList": [
            { "sggCode": "41110", "sggName": "수원시" },
            { "sggCode": "41130", "sggName": "성남시" },
            { "sggCode": "41150", "sggName": "의정부시" },
            { "sggCode": "41170", "sggName": "안양시" },
            { "sggCode": "41190", "sggName": "부천시", "kindergartenSggCodes": ["41192", "41194", "41196"] },
            { "sggCode": "41210", "sggName": "광명시" },
            { "sggCode": "41220", "sggName": "평택시" },
            { "sggCode": "41250", "sggName": "동두천시" },
            { "sggCode": "41270", "sggName": "안산시", "kindergartenSggCodes": ["41271", "41273"] },
            { "sggCode": "41280", "sggName": "고양시", "kindergartenSggCodes": ["41281", "41285", "41287"] },
            { "sggCode": "41290", "sggName": "과천시" },
            { "sggCode": "41310", "sggName": "구리시" },
            { "sggCode": "41360", "sggName": "남양주시" },
            { "sggCode": "41370", "sggName": "오산시" },
            { "sggCode": "41390", "sggName": "시흥시" },
            { "sggCode": "41410", "sggName": "군포시" },
            { "sggCode": "41430", "sggName": "의왕시" },
            { "sggCode": "41450", "sggName": "하남시" },
            { "sggCode": "41460", "sggName": "용인시", "kindergartenSggCodes": ["41461", "41463", "41465"] },
            { "sggCode": "41480", "sggName": "파주시" },
            { "sggCode": "41500", "sggName": "이천시" },
            { "sggCode": "41550", "sggName": "안성시" },
            { "sggCode": "41570", "sggName": "김포시" },
            { "sggCode": "41590", "sggName": "화성시", "kindergartenSggCodes": ["41591", "41593", "41595", "41597"] },
            { "sggCode": "41610", "sggName": "광주시" },
            { "sggCode": "41630", "sggName": "양주시" },
            { "sggCode": "41650", "sggName": "포천시" },
            { "sggCode": "41670", "sggName": "여주시", "childcareSggCode": "41730" },
            { "sggCode": "41800", "sggName": "연천군" },
            { "sggCode": "41820", "sggName": "가평군" },
            { "sggCode": "41830", "sggName": "양평군" }
        ]
    },
    {
        "sidoCode": "51",
        "sidoName": "강원특별자치도",
        "sggList": [
            { "sggCode": "51110", "sggName": "춘천시" },
            { "sggCode": "51130", "sggName": "원주시" },
            { "sggCode": "51150", "sggName": "강릉시" },
            { "sggCode": "51170", "sggName": "동해시" },
            { "sggCode": "51190", "sggName": "태백시" },
            { "sggCode": "51210", "sggName": "속초시" },
            { "sggCode": "51230", "sggName": "삼척시" },
            { "sggCode": "51720", "sggName": "홍천군" },
            { "sggCode": "51730", "sggName": "횡성군" },
            { "sggCode": "51750", "sggName": "영월군" },
            { "sggCode": "51760", "sggName": "평창군" },
            { "sggCode": "51770", "sggName": "정선군" },
            { "sggCode": "51780", "sggName": "철원군" },
            { "sggCode": "51790", "sggName": "화천군" },
            { "sggCode": "51800", "sggName": "양구군" },
            { "sggCode": "51810", "sggName": "인제군" },
            { "sggCode": "51820", "sggName": "고성군" },
            { "sggCode": "51830", "sggName": "양양군" }
        ]
    },
    {
        "sidoCode": "43",
        "sidoName": "충청북도",
        "sggList": [
            { "sggCode": "43110", "sggName": "청주시", "kindergartenSggCodes": ["43111", "43112", "43113", "43114"] },
            { "sggCode": "43130", "sggName": "충주시" },
            { "sggCode": "43150", "sggName": "제천시" },
            { "sggCode": "43720", "sggName": "보은군" },
            { "sggCode": "43730", "sggName": "옥천군" },
            { "sggCode": "43740", "sggName": "영동군" },
            { "sggCode": "43745", "sggName": "증평군", "childcareSggCode": "43780" },
            { "sggCode": "43750", "sggName": "진천군" },
            { "sggCode": "43760", "sggName": "괴산군" },
            { "sggCode": "43770", "sggName": "음성군" },
            { "sggCode": "43800", "sggName": "단양군" }
        ]
    },
    {
        "sidoCode": "44",
        "sidoName": "충청남도",
        "sggList": [
            { "sggCode": "44130", "sggName": "천안시", "kindergartenSggCodes": ["44131", "44133"] },
            { "sggCode": "44150", "sggName": "공주시" },
            { "sggCode": "44180", "sggName": "보령시" },
            { "sggCode": "44200", "sggName": "아산시" },
            { "sggCode": "44210", "sggName": "서산시" },
            { "sggCode": "44230", "sggName": "논산시" },
            { "sggCode": "44250", "sggName": "계룡시", "childcareUnavailable": true },
            { "sggCode": "44270", "sggName": "당진시", "childcareSggCode": "44830" },
            { "sggCode": "44710", "sggName": "금산군" },
            { "sggCode": "44760", "sggName": "부여군" },
            { "sggCode": "44770", "sggName": "서천군" },
            { "sggCode": "44790", "sggName": "청양군" },
            { "sggCode": "44800", "sggName": "홍성군" },
            { "sggCode": "44810", "sggName": "예산군" },
            { "sggCode": "44825", "sggName": "태안군" }
        ]
    },
    {
        "sidoCode": "52",
        "sidoName": "전북특별자치도",
        "sggList": [
            { "sggCode": "52110", "sggName": "전주시", "kindergartenSggCodes": ["52111", "52113"] },
            { "sggCode": "52130", "sggName": "군산시" },
            { "sggCode": "52140", "sggName": "익산시" },
            { "sggCode": "52180", "sggName": "정읍시" },
            { "sggCode": "52190", "sggName": "남원시" },
            { "sggCode": "52210", "sggName": "김제시" },
            { "sggCode": "52710", "sggName": "완주군" },
            { "sggCode": "52720", "sggName": "진안군" },
            { "sggCode": "52730", "sggName": "무주군" },
            { "sggCode": "52740", "sggName": "장수군" },
            { "sggCode": "52750", "sggName": "임실군" },
            { "sggCode": "52770", "sggName": "순창군" },
            { "sggCode": "52790", "sggName": "고창군" },
            { "sggCode": "52800", "sggName": "부안군" }
        ]
    },
    {
        "sidoCode": "47",
        "sidoName": "경상북도",
        "sggList": [
            { "sggCode": "47110", "sggName": "포항시" },
            { "sggCode": "47130", "sggName": "경주시" },
            { "sggCode": "47150", "sggName": "김천시" },
            { "sggCode": "47170", "sggName": "안동시" },
            { "sggCode": "47190", "sggName": "구미시" },
            { "sggCode": "47210", "sggName": "영주시" },
            { "sggCode": "47230", "sggName": "영천시" },
            { "sggCode": "47250", "sggName": "상주시" },
            { "sggCode": "47280", "sggName": "문경시" },
            { "sggCode": "47290", "sggName": "경산시" },
            { "sggCode": "47730", "sggName": "의성군" },
            { "sggCode": "47750", "sggName": "청송군" },
            { "sggCode": "47760", "sggName": "영양군" },
            { "sggCode": "47770", "sggName": "영덕군" },
            { "sggCode": "47820", "sggName": "청도군" },
            { "sggCode": "47830", "sggName": "고령군" },
            { "sggCode": "47840", "sggName": "성주군" },
            { "sggCode": "47850", "sggName": "칠곡군" },
            { "sggCode": "47900", "sggName": "예천군" },
            { "sggCode": "47920", "sggName": "봉화군" },
            { "sggCode": "47930", "sggName": "울진군" },
            { "sggCode": "47940", "sggName": "울릉군" }
        ]
    },
    {
        "sidoCode": "48",
        "sidoName": "경상남도",
        "sggList": [
            { "sggCode": "48120", "sggName": "창원시" },
            { "sggCode": "48170", "sggName": "진주시" },
            { "sggCode": "48220", "sggName": "통영시" },
            { "sggCode": "48240", "sggName": "사천시" },
            { "sggCode": "48250", "sggName": "김해시" },
            { "sggCode": "48270", "sggName": "밀양시" },
            { "sggCode": "48310", "sggName": "거제시" },
            { "sggCode": "48330", "sggName": "양산시" },
            { "sggCode": "48720", "sggName": "의령군" },
            { "sggCode": "48730", "sggName": "함안군" },
            { "sggCode": "48740", "sggName": "창녕군" },
            { "sggCode": "48820", "sggName": "고성군" },
            { "sggCode": "48840", "sggName": "남해군" },
            { "sggCode": "48850", "sggName": "하동군" },
            { "sggCode": "48860", "sggName": "산청군" },
            { "sggCode": "48870", "sggName": "함양군" },
            { "sggCode": "48880", "sggName": "거창군" },
            { "sggCode": "48890", "sggName": "합천군" }
        ]
    },
    {
        "sidoCode": "50",
        "sidoName": "제주특별자치도",
        "sggList": [
            { "sggCode": "50110", "sggName": "제주시", "childcareSggCode": "49110" },
            { "sggCode": "50130", "sggName": "서귀포시", "childcareSggCode": "49130" }
        ]
    }
];

async function fetchApi(endpoint, sidoCode, sggCode, retries = 3) {
    const url = `https://e-childschoolinfo.moe.go.kr/api/notice/${endpoint}.do?key=${API_KEY}&sidoCode=${sidoCode}&sggCode=${sggCode}`;
    const options = { headers: { 'User-Agent': 'Mozilla/5.0' } };

    for (let i = 0; i < retries; i++) {
        try {
            const data = await new Promise((resolve, reject) => {
                https.get(url, options, (res) => {
                    readApiResponse(res).then(resolve, reject);
                }).on('error', reject);
            });

            if (data.trim().startsWith('<')) {
                if (data.includes('high traffic') || data.includes('too many requests')) {
                    console.warn(`   ⚠️ High traffic detected for ${endpoint}. Retrying in 5s... (${i + 1}/${retries})`);
                    await delay(5000);
                    continue;
                }
                throw new Error('HTML returned instead of JSON');
            }
            return JSON.parse(data);
        } catch (e) {
            if (i === retries - 1) throw e;
            console.warn(`   ⚠️ Fetch error for ${endpoint}: ${e.message}. Retrying in 3s...`);
            await delay(3000);
        }
    }
}

// Some cities are only served by the kindergarten API at district level
// (e.g. 화성시 → 만세·효행·병점·동탄구). Fetch each district and merge the lists
// under the city code that the site and the childcare API use.
async function fetchKinderMerged(endpoint, sidoCode, sggCodes) {
    if (sggCodes.length === 1) return fetchApi(endpoint, sidoCode, sggCodes[0]);
    const kinderInfo = [];
    for (const code of sggCodes) {
        const data = await fetchApi(endpoint, sidoCode, code);
        const list = data && data.kinderInfo ? (Array.isArray(data.kinderInfo) ? data.kinderInfo : [data.kinderInfo]) : [];
        kinderInfo.push(...list);
    }
    return { kinderInfo };
}

async function fetchTenureHtmlMerged(sidoCode, sggCodes) {
    const pages = [];
    for (const code of sggCodes) pages.push(await fetchTenureHtml(sidoCode, code));
    return pages;
}

function fetchTenureHtml(sidoCode, sggCode) {
    return new Promise((resolve, reject) => {
        const url = `https://e-childschoolinfo.moe.go.kr/api/notice/excelDownload/yearOfWork.do?key=${API_KEY}&sidoCode=${sidoCode}&sggCode=${sggCode}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            readApiResponse(res).then(resolve, reject);
        }).on('error', reject);
    });
}

function parseTenureTable(html) {
    const tenureMap = new Map();
    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) return tenureMap;
    const trs = tbodyMatch[1].match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
    trs.forEach(tr => {
        const tds = tr.match(/<td>([\s\S]*?)<\/td>/gi) || [];
        if (tds.length >= 10) {
            const id = tds[0].replace(/<\/?td>/gi, '').trim();
            tenureMap.set(id, {
                under1: parseInt(tds[5].replace(/<\/?td>/gi, '').trim()) || 0,
                year1to2: parseInt(tds[6].replace(/<\/?td>/gi, '').trim()) || 0,
                year2to4: parseInt(tds[7].replace(/<\/?td>/gi, '').trim()) || 0,
                year4to6: parseInt(tds[8].replace(/<\/?td>/gi, '').trim()) || 0,
                over6: parseInt(tds[9].replace(/<\/?td>/gi, '').trim()) || 0
            });
        }
    });
    return tenureMap;
}

// ── 연령반 운영 현황 (2026-11-17) ─────────────────────────────────────────────
// 공시 원본의 연령별 학급·원아·정원과 혼합반·특수반을 그대로 옮긴다. 판정은 화면(src/utils/ageClasses.ts)에서 한다.
// 원본에 없거나 숫자가 아니면 null(정보 부족). 0으로 바꾸면 '이번 공시에 없음'으로 잘못 읽힌다.
const num = (v) => {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    const n = Number(String(v).trim());
    return Number.isInteger(n) && n >= 0 ? n : null;
};
const hasAny = (item, keys) => keys.some(k => num(item[k]) !== null);

/** "20262" → { key: '20262', label: '2026년 2차 공시' } */
function kindergartenBasis(pbnttmng) {
    const m = String(pbnttmng || '').match(/^(\d{4})(\d)$/);
    return m ? { kind: 'disclosure', key: m[0], label: `${m[1]}년 ${m[2]}차 공시` } : { kind: 'unknown', key: null, label: '공시 차수 정보 없음' };
}

function kindergartenAgeClasses(item) {
    // 연령별 학급 필드가 하나도 없으면(스키마 변경·부분 응답) 연령반 정보를 만들지 않는다.
    if (!hasAny(item, ['clcnt3', 'clcnt4', 'clcnt5', 'mixclcnt'])) return undefined;
    const byAge = {};
    for (const age of [3, 4, 5]) {
        byAge[age] = { classes: num(item[`clcnt${age}`]), children: num(item[`ppcnt${age}`]), capacity: num(item[`ag${age}fpcnt`]) };
    }
    const mixedClasses = num(item.mixclcnt);
    return {
        basis: kindergartenBasis(item.pbnttmng),
        mixedKnown: num(item.mixclcnt) !== null,
        byAge,
        mixed: (mixedClasses ?? 0) > 0 || (num(item.mixppcnt) ?? 0) > 0
            // 공시는 혼합반 수만 주고 어떤 연령을 묶었는지(3+4, 4+5, 3+4+5)는 주지 않는다 → ages 는 null, 가능한 범위만.
            ? [{ label: '혼합반', ages: null, possibleAges: [3, 4, 5], classes: mixedClasses ?? 0, children: num(item.mixppcnt), capacity: num(item.mixfpcnt) }]
            : [],
        special: { classes: num(item.shclcnt), children: num(item.shppcnt) },
    };
}

function childcareAgeClasses(item) {
    if (!hasAny(item, ['CLASS_CNT_00', 'CLASS_CNT_01', 'CLASS_CNT_02', 'CLASS_CNT_03', 'CLASS_CNT_04', 'CLASS_CNT_05', 'CLASS_CNT_M2', 'CLASS_CNT_M5'])) return undefined;
    const byAge = {};
    for (let age = 0; age <= 5; age++) {
        byAge[age] = { classes: num(item[`CLASS_CNT_0${age}`]), children: num(item[`CHILD_CNT_0${age}`]), waiting: num(item[`EW_CNT_0${age}`]) };
    }
    // 보육정보 공개 API 명세 v1.6: M2 = 영아혼합(만 0~2세), M5 = 유아혼합(만 3~5세).
    // M3 은 명세에 없는 항목이라 연령 범위를 추정하지 않는다(ages·possibleAges 모두 null).
    // M2·M5 도 실제 구성(예: 영아 0+1, 1+2 — 보육사업안내상 0+2 불가)은 공시에 없다 → ages 는 null, 가능한 범위만 둔다.
    const mixed = [
        { label: '영아혼합반', ages: null, possibleAges: [0, 1, 2], classes: num(item.CLASS_CNT_M2) ?? 0, children: num(item.CHILD_CNT_M2) },
        { label: '혼합반(연령 범위 미공시)', ages: null, possibleAges: null, classes: num(item.CLASS_CNT_M3) ?? 0, children: num(item.CHILD_CNT_M3) },
        { label: '유아혼합반', ages: null, possibleAges: [3, 4, 5], classes: num(item.CLASS_CNT_M5) ?? 0, children: num(item.CHILD_CNT_M5) },
    ].filter(m => m.classes > 0 || (m.children ?? 0) > 0);
    const date = String(item.datastdrdt || '').trim();
    // 혼합반 필드(M2·M5)가 원본에 없으면 '혼합반 없음'이 아니라 모름이다.
    const mixedKnown = num(item.CLASS_CNT_M2) !== null && num(item.CLASS_CNT_M5) !== null;
    return {
        mixedKnown,
        basis: /^\d{4}-\d{2}-\d{2}$/.test(date) ? { kind: 'date', key: date, label: `${date} 기준` } : { kind: 'unknown', key: null, label: '기준일 정보 없음' },
        byAge,
        mixed,
        special: { classes: num(item.CLASS_CNT_SP), children: num(item.CHILD_CNT_SP) },
        waitingOver6: num(item.EW_CNT_M6),
    };
}

function normalizeData(basicInfoData, teachersInfoData, tenureMap, schoolBusData, mealMap, safetyMap, sidoCode, sggCode) {
    let rawList = [];
    if (Array.isArray(basicInfoData)) rawList = basicInfoData;
    else if (basicInfoData.kinderInfo) rawList = Array.isArray(basicInfoData.kinderInfo) ? basicInfoData.kinderInfo : [basicInfoData.kinderInfo];
    else {
        for (const key in basicInfoData) {
            if (Array.isArray(basicInfoData[key])) { rawList = basicInfoData[key]; break; }
        }
    }

    let teachersList = [];
    if (teachersInfoData) {
        if (Array.isArray(teachersInfoData)) teachersList = teachersInfoData;
        else if (teachersInfoData.kinderInfo) teachersList = Array.isArray(teachersInfoData.kinderInfo) ? teachersInfoData.kinderInfo : [teachersInfoData.kinderInfo];
        else {
            for (const key in teachersInfoData) {
                if (Array.isArray(teachersInfoData[key])) { teachersList = teachersInfoData[key]; break; }
            }
        }
    }
    const teachersMap = new Map(teachersList.map(t => [t.kindercode, t]));

    let busList = [];
    if (schoolBusData) {
        if (Array.isArray(schoolBusData)) busList = schoolBusData;
        else if (schoolBusData.kinderInfo) busList = Array.isArray(schoolBusData.kinderInfo) ? schoolBusData.kinderInfo : [schoolBusData.kinderInfo];
        else {
            for (const key in schoolBusData) {
                if (Array.isArray(schoolBusData[key])) { busList = schoolBusData[key]; break; }
            }
        }
    }
    const busMap = new Map(busList.map(b => [b.kindercode, b]));

    return validateInstitutions(rawList.map((item, index) => {
        const name = item.kindername || item.schul_nm || item.name || '-';
        const establishField = item.establish || item.fond_sc_nm || item.type || '';
        const address = item.addr || item.adres || '-';
        const lat = item.lttdcdnt ?? item.la ?? item.lat ?? null;
        const lng = item.lngtcdnt ?? item.lo ?? item.lng ?? null;
        const phone = sanitizePhone(item.telno || item.tel);

        const capacity = parseInt(item.prmstfcnt || item.mstbc || item.capacity || '0', 10);
        const currentPupils = (parseInt(item.ppcnt3 || 0, 10) + parseInt(item.ppcnt4 || 0, 10) + parseInt(item.ppcnt5 || 0, 10) + parseInt(item.mixppcnt || 0, 10) + parseInt(item.shppcnt || 0, 10)) || parseInt(item.ppcnt || item.current || '0', 10);
        const operatingHours = item.opertime || item.time || '-';

        const busInfo = busMap.get(item.kindercode);
        let hasSchoolBus = false;
        if (busInfo) {
            hasSchoolBus = busInfo.vhcl_oprn_yn === 'Y';
        } else {
            hasSchoolBus = item.vhcle_oprn_yn === 'Y' || item.bus === 'Y';
        }

        const uuid = item.kindercode || item.kinderinfoId;
        const alimiUrl = uuid ? `https://e-childschoolinfo.moe.go.kr/kinderMt/kinderViolation.do?ittId=${uuid}` : null;

        let teacherRatio = '-';
        let childrenPerTeacher = 0;
        const tInfo = teachersMap.get(item.kindercode);
        if (tInfo) {
            const expert = (parseInt(tInfo.hdst_tchr_qacnt) || 0) + (parseInt(tInfo.rgth_gd1_qacnt) || 0);
            const total = expert + (parseInt(tInfo.rgth_gd2_qacnt) || 0) + (parseInt(tInfo.asth_qacnt) || 0);
            if (total > 0) teacherRatio = `${Math.round((expert / total) * 100)}% (${expert}명/${total}명)`;

            const classTeachers = (parseInt(tInfo.asps_thcnt) || 0) + (parseInt(tInfo.gnrl_thcnt) || 0) + (parseInt(tInfo.spcn_thcnt) || 0) + (parseInt(tInfo.hdst_thcnt) || 0);
            if (classTeachers > 0) childrenPerTeacher = Number((currentPupils / classTeachers).toFixed(1));
        }

        const sInfo = safetyMap ? safetyMap.get(item.kindercode) : null;
        let safetyStatus = '-';
        if (sInfo) {
            const fire = sInfo.fire_avd_yn === 'Y' ? '소방대피훈련완료' : '';
            const cctv = sInfo.cctv_ist_yn === 'Y' ? 'CCTV설치' : '';
            const gas = sInfo.gas_ck_yn === 'Y' ? '가스점검완료' : '';
            safetyStatus = [fire, cctv, gas].filter(Boolean).join(', ') || '-';
        }

        const mInfo = mealMap ? mealMap.get(item.kindercode) : null;
        let mealStatus = '-';
        if (mInfo) {
            const way = mInfo.mlsr_oprn_way_tp_cd === '1' ? '직영급식' : '위탁급식';
            const ntrt = mInfo.ntrt_tchr_agmt_yn === 'Y' ? '영양사배치' : '';
            mealStatus = [way, ntrt].filter(Boolean).join(', ') || '-';
        }

        let mappedType = '국공립';
        if (establishField.includes('사립')) mappedType = '사립';
        else if (establishField.includes('가정')) mappedType = '가정';
        else if (establishField.includes('민간')) mappedType = '민간';

        return {
            id: String(uuid || index + 1),
            sidoCode,
            sggCode,
            name,
            type: mappedType,
            source: '유치원',
            address,
            latitude: lat,
            longitude: lng,
            phone,
            capacity: isNaN(capacity) ? 0 : capacity,
            currentPupils: isNaN(currentPupils) ? 0 : currentPupils,
            childrenPerTeacher,
            safetyStatus,
            mealStatus,
            operatingHours,
            hasSchoolBus,
            expenseLevel: '-',
            ageRange: '-',
            ageClasses: kindergartenAgeClasses(item),
            teacherRatio,
            teacherTenure: (() => {
                const raw = tenureMap.get(item.kindercode);
                if (!raw) return undefined;
                const sum = raw.under1 + raw.year1to2 + raw.year2to4 + raw.year4to6 + raw.over6;
                if (sum === 0) return undefined;
                const pct = {
                    under1: Math.round((raw.under1 / sum) * 100),
                    year1to2: Math.round((raw.year1to2 / sum) * 100),
                    year2to4: Math.round((raw.year2to4 / sum) * 100),
                    year4to6: Math.round((raw.year4to6 / sum) * 100),
                    over6: Math.round((raw.over6 / sum) * 100),
                };
                const pctSum = pct.under1 + pct.year1to2 + pct.year2to4 + pct.year4to6 + pct.over6;
                pct.over6 = Math.max(0, pct.over6 + (100 - pctSum));
                return pct;
            })(),
            alimiUrl,
            tags: []
        };
    })).institutions;
}

function extractSpclMap(afterSchoolData) {
    const spclMap = new Map();
    if (!afterSchoolData) return spclMap;
    let list = [];
    if (Array.isArray(afterSchoolData)) list = afterSchoolData;
    else if (afterSchoolData.kinderInfo) list = Array.isArray(afterSchoolData.kinderInfo) ? afterSchoolData.kinderInfo : [afterSchoolData.kinderInfo];

    list.forEach(item => {
        const code = item.kindercode;
        const name = item.spcl_prgm_nm || item.after_school_program_nm || item.spcl_activ_hv_sttus;
        if (code && name && name !== 'N' && name !== '정보없음' && name !== '-') {
            const existing = spclMap.get(code) || [];
            if (!existing.includes(name)) {
                existing.push(name);
                spclMap.set(code, existing);
            }
        }
    });
    return spclMap;
}

function extractMap(data) {
    const m = new Map();
    if (!data || !data.kinderInfo) return m;
    const list = Array.isArray(data.kinderInfo) ? data.kinderInfo : [data.kinderInfo];
    list.forEach(i => m.set(i.kindercode, i));
    return m;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// =============================================
// 어린이집 API (cpmsapi030) 관련 함수
// =============================================

/**
 * 어린이집 API 응답 분류 (연령반 2단계). 오류 코드(보육정보 공개 API 명세 v1.6):
 *   INFO-200 검색결과 없음 → 'no-result' (그 지역만 건너뜀)
 *   INFO-100 인증키 무효, INFO-300 일 요청 초과, INFO-400 인증키 만료, ERROR-xxx → 'fatal'
 * 'fatal' 은 모든 지역에 같은 문제가 생기므로 옛 파일을 남긴 채 '성공'으로 끝나지 않게 바로 멈춘다.
 * (정보공개포털 운영계정 키는 사용기간이 12개월이다.)
 */
const CHILDCARE_FATAL_HINT = {
    'INFO-100': '인증키가 유효하지 않습니다',
    'INFO-300': '일 요청 건수를 초과했습니다',
    'INFO-400': '인증키가 만료되었습니다 — 어린이집 정보공개포털에서 OpenAPI 키를 갱신하세요',
};

async function withRetries(fn, attempts, waitMs) {
    for (let i = 1; ; i++) {
        try { return await fn(); } catch (e) {
            if (i >= attempts) throw e;
            console.warn(`   ⚠️ ${e.message} — 다시 시도 ${i}/${attempts - 1}`);
            await delay(waitMs);
        }
    }
}

/**
 * 이번 실행에서 실제로 다시 받아 쓴 파일과 날짜(KST)를 public/data/fetch-manifest.json 에 남긴다.
 * 수집에 실패해 옛 파일이 남은 지역은 예전 날짜를 그대로 둔다 → 연령반 이력이 오래된 데이터에 새 날짜를 붙이지 않는다.
 */
function writeFetchManifest(dataDir, fetched) {
    const file = path.join(dataDir, 'fetch-manifest.json');
    const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
    let manifest = { files: {} };
    try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* 첫 실행 */ }
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    for (const name of fetched) manifest.files[name] = today;
    manifest.updatedAt = today;
    try {
        fs.writeFileSync(temp, JSON.stringify(manifest, null, 1), 'utf-8');
        fs.renameSync(temp, file);
    } finally {
        if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
    }
    console.log(`🗂️ fetch-manifest: ${fetched.size}개 파일을 ${today} 수집으로 기록`);
}

function seedStagingDirectory(dataDir, stagingDir) {
    for (const name of fs.readdirSync(dataDir)) {
        if (/^\d{2}_\d{5}(?:_childcare)?\.json$/.test(name) || name === 'regions.json') {
            fs.copyFileSync(path.join(dataDir, name), path.join(stagingDir, name));
        }
    }
}

function expectedCollectionFiles(selection) {
    const expected = [];
    for (const sido of REGIONS) {
        for (const sgg of sido.sggList) {
            const base = `${sido.sidoCode}_${sgg.sggCode}`;
            if (selection.kindergarten) expected.push(`${base}.json`);
            if (selection.childcare) expected.push(`${base}_childcare.json`);
        }
    }
    return expected;
}

function assertCollectionComplete(selection, fetched) {
    const missing = expectedCollectionFiles(selection).filter(name => !fetched.has(name));
    if (missing.length > 0) {
        const sample = missing.slice(0, 5).join(', ');
        throw new Error(`선택한 수집 대상이 완성되지 않아 기존 데이터를 유지합니다 (${missing.length}개 누락: ${sample}${missing.length > 5 ? ', ...' : ''}).`);
    }
}

function replaceFileAtomically(source, destination) {
    const temp = `${destination}.tmp-${process.pid}-${Date.now()}`;
    try {
        fs.copyFileSync(source, temp);
        fs.renameSync(temp, destination);
    } finally {
        if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
    }
}

function commitStagedCollection({ stagingDir, dataDir, fetched, includeRegions, auditReport }) {
    for (const name of [...fetched].sort()) {
        replaceFileAtomically(path.join(stagingDir, name), path.join(dataDir, name));
    }
    if (includeRegions) {
        replaceFileAtomically(path.join(stagingDir, 'regions.json'), path.join(dataDir, 'regions.json'));
    }
    replaceFileAtomically(auditReport, path.resolve(__dirname, '../docs/coordinate-audit.json'));
}

function validateStagedCollection(stagingDir, dataDir) {
    const regions = JSON.parse(fs.readFileSync(path.join(stagingDir, 'regions.json'), 'utf8'));
    const files = regionFiles(regions);
    const unavailable = unavailableChildcareFiles(regions);
    const current = {};
    const baseline = {};

    for (const name of files) {
        const stagedFile = path.join(stagingDir, name);
        if (!fs.existsSync(stagedFile)) throw new Error(`검증할 지역 데이터가 없습니다: ${name}`);
        const records = JSON.parse(fs.readFileSync(stagedFile, 'utf8'));
        if (!Array.isArray(records)) throw new Error(`지역 데이터 형식이 배열이 아닙니다: ${name}`);
        if (unavailable.has(name)) {
            if (records.length !== 0) throw new Error(`API 미제공 지역 파일이 비어 있지 않습니다: ${name}`);
            continue;
        }
        const placeholders = records.filter(isPlaceholder);
        if (placeholders.length > 0) throw new Error(`자리표시 기관이 감지되었습니다: ${name}`);
        current[name] = records.length;

        const existingFile = path.join(dataDir, name);
        if (fs.existsSync(existingFile)) {
            const existing = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
            if (Array.isArray(existing)) baseline[name] = existing.length;
        }
    }

    const { problems } = compareCounts(current, baseline);
    if (problems.length > 0) {
        throw new Error(`기관 수 감소 검증에 실패했습니다: ${problems.slice(0, 5).join('; ')}`);
    }
    const broken = findBrokenText(stagingDir);
    if (broken.length > 0) {
        throw new Error(`문자 인코딩 오류가 감지되었습니다: ${broken.slice(0, 5).map(item => item.file).join(', ')}`);
    }
}

function fetchChildcareApi(sggCode) {
    return new Promise((resolve, reject) => {
        const url = `http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=${CHILDCARE_API_KEY}&arcode=${sggCode}`;
        http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            readApiResponse(res).then(resolve, reject);
        }).on('error', reject);
    });
}

function parseXmlItems(xml) {
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi);
    if (!itemMatches) return items;

    for (const itemXml of itemMatches) {
        const obj = {};
        // Strip out the outer <item> and </item> to parse inner tags correctly
        const innerXml = itemXml.substring(itemXml.indexOf('>') + 1, itemXml.lastIndexOf('</'));
        const tagMatches = innerXml.matchAll(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g);
        for (const m of tagMatches) {
            obj[m[1].trim()] = m[2].trim();
        }
        items.push(obj);
    }
    return items;
}

function mapChildcareType(crtypename) {
    if (!crtypename) return '민간';
    if (crtypename.includes('국공립')) return '국공립';
    if (crtypename.includes('사회복지')) return '사회복지법인';
    if (crtypename.includes('법인') || crtypename.includes('단체')) return '법인단체';
    if (crtypename.includes('민간')) return '민간';
    if (crtypename.includes('가정')) return '가정';
    if (crtypename.includes('부모협동')) return '부모협동';
    if (crtypename.includes('직장')) return '직장';
    return '민간';
}

const CHILDCARE_TAG_RULES = [
    ['야간연장', '야간운영'],
    ['24시간', '24시간'],
    ['장애아통합', '장애아통합'],
    ['장애아전담', '장애아전담'],
    ['영아전담', '영아전담'],
    ['시간제보육', '시간제보육'],
    ['휴일보육', '휴일운영'],
    ['공동육아', '공동육아'],
];

function buildChildcareTags(specialPrograms, hasSchoolBus) {
    const tags = [];
    if (hasSchoolBus) tags.push('통학차량');
    if (!specialPrograms || specialPrograms === '-') return tags;
    for (const [keyword, tag] of CHILDCARE_TAG_RULES) {
        if (specialPrograms.includes(keyword) && !tags.includes(tag)) {
            tags.push(tag);
        }
    }
    return tags;
}

function normalizeChildcareData(items, sidoCode, sggCode) {
    return validateInstitutions(items
        .filter(item => {
            const status = item.crstatusname || '';
            return status === '정상' || status === '재개' || status === '';
        })
        .map((item, index) => {
            const id = item.stcode || String(index + 1);
            const name = item.crname || '-';
            const type = mapChildcareType(item.crtypename);
            const address = item.craddr || '-';
            const lat = item.la ?? null;
            const lng = item.lo ?? null;
            const phone = sanitizePhone(item.crtelno);
            const capacity = parseInt(item.crcapat) || 0;
            const currentPupils = parseInt(item.crchcnt) || 0;
            const hasSchoolBus = (item.crcargbname || '').includes('운용');
            const cctvCount = parseInt(item.cctvinstlcnt) || 0;

            // 교사 전문성 비율 (보육교사+특수교사 / 전체직원)
            const careTeachersCount = parseInt(item.EM_CNT_A2) || 0;
            const specialTeachersCount = parseInt(item.EM_CNT_A3) || 0;
            const totalCareTeachers = careTeachersCount + specialTeachersCount;
            const totalStaff = parseInt(item.EM_CNT_TOT) || 0;
            
            const teacherRatio = (totalStaff > 0 && totalCareTeachers > 0)
                ? `${Math.round((totalCareTeachers / totalStaff) * 100)}% (${totalCareTeachers}명/${totalStaff}명)`
                : '-';

            // 교직원 근속 (API 필드명 대문자, 백분율 그대로 저장)
            const parsePct = (val) => Math.min(100, Math.max(0, parseInt(val) || 0));

            // 교사 1인당 아동 수 (보육교사 기준)
            const childrenPerTeacher = careTeachersCount > 0 ? Number((currentPupils / careTeachersCount).toFixed(1)) : 0;

            const teacherTenure = {
                under1: parsePct(item.EM_CNT_0Y),
                year1to2: parsePct(item.EM_CNT_1Y),
                year2to4: parsePct(item.EM_CNT_2Y),
                year4to6: parsePct(item.EM_CNT_4Y),
                over6: parsePct(item.EM_CNT_6Y),
            };

            // 입소대기 아동수
            const waitlistTotal = parseInt(item.EW_CNT_TOT) || 0;

            // 연령별 원아 수 / 반 수 → 반당 원아 비율 (반당 교사 1명 기준)
            const ageBreakdown = {};
            for (let age = 0; age <= 5; age++) {
                const childCount = parseInt(item[`CHILD_CNT_0${age}`]) || 0;
                const classCount = parseInt(item[`CLASS_CNT_0${age}`]) || 0;
                if (classCount > 0) {
                    ageBreakdown[age] = {
                        children: childCount,
                        classes: classCount,
                        ratio: Number((childCount / classCount).toFixed(1)),
                    };
                }
            }

            // 연령 범위 — CLASS_CNT(반 편성) 기준으로 판단, 현원이 0이어도 반이 있으면 포함
            // CLASS_CNT_M2: 영아혼합(만 0~2세), CLASS_CNT_M5: 유아혼합(만 3~5세) — 명세 v1.6.
            // (2026-11-17 이전에는 M5 를 0~5세로 잘못 펼쳐 유아혼합반만 있는 곳의 대상 연령이 만 0세부터로 나왔다.)
            const ageSet = new Set();
            if (parseInt(item.CLASS_CNT_00) > 0) ageSet.add(0);
            if (parseInt(item.CLASS_CNT_01) > 0) ageSet.add(1);
            if (parseInt(item.CLASS_CNT_02) > 0) ageSet.add(2);
            if (parseInt(item.CLASS_CNT_03) > 0) ageSet.add(3);
            if (parseInt(item.CLASS_CNT_04) > 0) ageSet.add(4);
            if (parseInt(item.CLASS_CNT_05) > 0) ageSet.add(5);
            if (parseInt(item.CLASS_CNT_M2) > 0) [0, 1, 2].forEach(a => ageSet.add(a));
            if (parseInt(item.CLASS_CNT_M5) > 0) [3, 4, 5].forEach(a => ageSet.add(a));
            const sortedAges = [...ageSet].sort((a, b) => a - b);
            const ageRange = sortedAges.length === 0 ? '-'
                : sortedAges.length === 1 ? `만 ${sortedAges[0]}세`
                : `만 ${sortedAges[0]}세 ~ 만 ${sortedAges[sortedAges.length - 1]}세`;

            // 특이사항/제공서비스 ("일반"은 의미 없으므로 제외)
            const rawSpec = (item.crspec || '').trim();
            const specialPrograms = (rawSpec === '' || rawSpec === '-' || rawSpec === '일반') ? '-' : rawSpec;

            // 안전 현황 (CCTV만 제공)
            const safetyStatus = cctvCount > 0 ? `CCTV ${cctvCount}대 설치` : '-';

            // 급식 현황 (영양사 유무로 판단)
            const nutritionistCount = parseInt(item.EM_CNT_A5) || 0;
            const mealStatus = nutritionistCount > 0 ? `영양사 배치 (${nutritionistCount}명)` : '-';

            // 공식 어린이집 정보공개 포털 URL (팝업)
            const alimiUrl = `https://info.childcare.go.kr/info_html5/pnis/search/preview/SummaryInfoSlPu.jsp?flag=YJ&STCODE_POP=${id}`;

            return {
                id,
                sidoCode,
                sggCode,
                name,
                type,
                source: '어린이집',
                address,
                latitude: lat,
                longitude: lng,
                phone,
                capacity,
                currentPupils,
                childrenPerTeacher,
                teacherRatio,
                safetyStatus,
                mealStatus,
                operatingHours: '-',
                hasSchoolBus,
                expenseLevel: '-',
                ageRange,
                ageBreakdown: Object.keys(ageBreakdown).length > 0 ? ageBreakdown : undefined,
                ageClasses: childcareAgeClasses(item),
                operatingStatus: item.crstatusname || undefined,
                teacherTenure,
                waitlistTotal,
                cctvCount,
                specialPrograms: specialPrograms === '-' ? undefined : specialPrograms,
                alimiUrl,
                tags: buildChildcareTags(specialPrograms, hasSchoolBus),
            };
        })).institutions;
}

async function run(args = process.argv.slice(2), options = {}) {
    const fetchedThisRun = new Set();
    let stagingDir = null;
    try {
        const selection = parseSourceSelection(args);
        console.log(`🔎 수집 사전 검증 시작 (대상: ${selection.mode})`);
        await runPreflight({ config: options.config || API_CONFIG, selection, checks: options.checks });
        console.log('✅ 필수 환경설정과 API 인증 상태가 정상입니다.');

        const dataDir = path.resolve(__dirname, '../public/data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yourpick-fetch-'));
        seedStagingDirectory(dataDir, stagingDir);

        if (selection.kindergarten) {
            fs.writeFileSync(path.join(stagingDir, 'regions.json'), JSON.stringify(REGIONS.map(sido => ({ ...sido, sggList: sido.sggList.map(({ sggCode, sggName, childcareUnavailable }) => ({ sggCode, sggName, ...(childcareUnavailable ? { childcareUnavailable } : {}) })) })), null, 2), 'utf-8');
            console.log('✅ Generated regions.json metadata.');

            for (const sido of REGIONS) {
                for (const sgg of sido.sggList) {
                    console.log(`Fetching data for ${sido.sidoName} ${sgg.sggName}...`);
                    const kinderCodes = sgg.kindergartenSggCodes || [sgg.sggCode];
                    const [basicInfo, teachersInfo, afterSchoolData, schoolBusData, mealData, safetyData, , tenureHtml] = await Promise.all([
                        fetchKinderMerged('basicInfo2', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ basicInfo2 fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchKinderMerged('teachersInfo', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ teachersInfo fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchKinderMerged('afterSchoolPresent', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ afterSchoolPresent fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchKinderMerged('schoolBus', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ schoolBus fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchKinderMerged('schoolMeal', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ schoolMeal fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchKinderMerged('safetyEdu', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ safetyEdu fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchKinderMerged('environmentHygiene', sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ environmentHygiene fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return null;
                        }),
                        fetchTenureHtmlMerged(sido.sidoCode, kinderCodes).catch((e) => {
                            console.warn(`   ⚠️ tenureHtml fetch failed for ${sido.sidoName} ${sgg.sggName}: ${e.message}`);
                            return [];
                        })
                    ]);

                    if (!basicInfo) {
                        throw new Error(`${sido.sidoName} ${sgg.sggName} basicInfo2를 받지 못했습니다.`);
                    }

                    const tenureMap = new Map();
                    for (const html of tenureHtml) for (const [id, value] of parseTenureTable(html)) tenureMap.set(id, value);
                    const spclMap = extractSpclMap(afterSchoolData);
                    const mealMap = extractMap(mealData);
                    const safetyMap = extractMap(safetyData);

                    const normalizedList = normalizeData(basicInfo, teachersInfo, tenureMap, schoolBusData, mealMap, safetyMap, sido.sidoCode, sgg.sggCode);

                    normalizedList.forEach(inst => {
                        const programs = spclMap.get(inst.id);
                        inst.specialPrograms = programs ? programs.join(', ') : '-';
                    });

                    const filename = `${sido.sidoCode}_${sgg.sggCode}.json`;
                    fs.writeFileSync(path.join(stagingDir, filename), JSON.stringify(normalizedList), 'utf-8');
                    fetchedThisRun.add(filename);
                    console.log(`✅ Saved ${normalizedList.length} institutions to ${filename}`);

                    await delay(2000);
                }
            }
            console.log('🎉 All kindergarten data successfully split and written!');
        }

        // =============================================
        // 어린이집 데이터 수집
        // =============================================
        if (selection.childcare) {
            console.log('\n📦 Starting childcare data collection...');
            for (const sido of REGIONS) {
                for (const sgg of sido.sggList) {
                    console.log(`[어린이집] Fetching data for ${sido.sidoName} ${sgg.sggName}...`);
                    if (sgg.childcareUnavailable) {
                        // 어린이집 API 가 어떤 코드로도 결과를 주지 않는 지역(2026-11-17 확인: 계룡시). 빈 목록을 쓰고 화면이 이유를 알린다.
                        fs.writeFileSync(path.join(stagingDir, `${sido.sidoCode}_${sgg.sggCode}_childcare.json`), '[]', 'utf-8');
                        fetchedThisRun.add(`${sido.sidoCode}_${sgg.sggCode}_childcare.json`);
                        console.log('   ⏭️ 어린이집 API 미제공 지역 — 빈 목록');
                        continue;
                    }
                    try {
                        // 어린이집 API 가 다른 코드로만 답하는 지역(예: 여주시 = 옛 여주군 41730).
                        // 서버 오류(5xx·네트워크)는 3번까지 다시 시도한다. 실패하면 옛 파일이 남고 수집 기록에는 오르지 않는다.
                        const xml = await withRetries(() => fetchChildcareApi(sgg.childcareSggCode || sgg.sggCode), 3, 3000);

                        const verdict = classifyChildcareResponse(xml);
                        if (verdict.kind === 'fatal') {
                            throw new Error(`어린이집 API ${verdict.code}: ${CHILDCARE_FATAL_HINT[verdict.code] || '서버 오류'} (${sgg.sggName}에서 중단)`);
                        }
                        if (verdict.kind === 'no-result' || xml.includes('traffic')) {
                            const errMatch = xml.match(/<(ERROR|INFO)[^>]*>([^<]*)/i);
                            if (xml.includes('traffic')) {
                                console.warn(`   ⚠️ Childcare API high traffic. Waiting 10s...`);
                                await delay(10000);
                            }
                            console.warn(`   ⚠️ API response: ${errMatch ? errMatch[0] : xml.substring(0, 100)}`);
                            continue;
                        }

                        const items = parseXmlItems(xml);
                        if (items.length === 0) {
                            console.warn(`   ⚠️ No items found for ${sgg.sggName}`);
                            continue;
                        }

                        const normalizedList = normalizeChildcareData(items, sido.sidoCode, sgg.sggCode);
                        const filename = `${sido.sidoCode}_${sgg.sggCode}_childcare.json`;
                        fs.writeFileSync(path.join(stagingDir, filename), JSON.stringify(normalizedList), 'utf-8');
                        fetchedThisRun.add(filename);
                        console.log(`   ✅ Saved ${normalizedList.length} childcare centers to ${filename}`);

                        await delay(2000);
                    } catch (err) {
                        throw new Error(`어린이집 데이터 수집 실패 (${sido.sidoName} ${sgg.sggName}): ${err.message}`);
                    }
                }
            }
            console.log('🎉 All childcare data successfully collected!');
        }

        assertCollectionComplete(selection, fetchedThisRun);
        const auditReport = path.join(stagingDir, 'coordinate-audit.json');
        auditDirectory(stagingDir, { write: true, reportPath: auditReport });
        validateStagedCollection(stagingDir, dataDir);
        commitStagedCollection({
            stagingDir,
            dataDir,
            fetched: fetchedThisRun,
            includeRegions: selection.kindergarten,
            auditReport,
        });
        writeFetchManifest(dataDir, fetchedThisRun);
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
        error.alreadyReported = true;
        throw error;
    } finally {
        if (stagingDir) fs.rmSync(stagingDir, { recursive: true, force: true });
    }
}

if (require.main === module) {
    run().catch((error) => {
        process.exitCode = error.exitCode || 1;
    });
}
module.exports = { run, validateStagedCollection, normalizeData, normalizeChildcareData, parseXmlItems, classifyChildcareResponse, kindergartenAgeClasses, childcareAgeClasses, kindergartenBasis };
