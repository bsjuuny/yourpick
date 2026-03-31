/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const API_KEY = process.env.NEXT_PUBLIC_CHILDINFO_API_KEY;
const CHILDCARE_API_KEY = process.env.CHILDCARE_API_KEY;

if (!API_KEY) {
    console.error('❌ NEXT_PUBLIC_CHILDINFO_API_KEY is not set in .env.local');
    process.exit(1);
}

if (!CHILDCARE_API_KEY) {
    console.warn('⚠️ CHILDCARE_API_KEY is not set in .env.local — 어린이집 데이터 수집이 비활성화됩니다.');
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
            { "sggCode": "28110", "sggName": "중구" },
            { "sggCode": "28140", "sggName": "동구" },
            { "sggCode": "28177", "sggName": "미추홀구" },
            { "sggCode": "28185", "sggName": "연수구" },
            { "sggCode": "28200", "sggName": "남동구" },
            { "sggCode": "28237", "sggName": "부평구" },
            { "sggCode": "28245", "sggName": "계양구" },
            { "sggCode": "28260", "sggName": "서구" },
            { "sggCode": "28710", "sggName": "강화군" },
            { "sggCode": "28720", "sggName": "옹진군" }
        ]
    },
    {
        "sidoCode": "29",
        "sidoName": "광주광역시",
        "sggList": [
            { "sggCode": "29110", "sggName": "동구" },
            { "sggCode": "29140", "sggName": "서구" },
            { "sggCode": "29155", "sggName": "남구" },
            { "sggCode": "29170", "sggName": "북구" },
            { "sggCode": "29200", "sggName": "광산구" }
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
            { "sggCode": "41190", "sggName": "부천시" },
            { "sggCode": "41210", "sggName": "광명시" },
            { "sggCode": "41220", "sggName": "평택시" },
            { "sggCode": "41250", "sggName": "동두천시" },
            { "sggCode": "41270", "sggName": "안산시" },
            { "sggCode": "41280", "sggName": "고양시" },
            { "sggCode": "41290", "sggName": "과천시" },
            { "sggCode": "41310", "sggName": "구리시" },
            { "sggCode": "41360", "sggName": "남양주시" },
            { "sggCode": "41370", "sggName": "오산시" },
            { "sggCode": "41390", "sggName": "시흥시" },
            { "sggCode": "41410", "sggName": "군포시" },
            { "sggCode": "41430", "sggName": "의왕시" },
            { "sggCode": "41450", "sggName": "하남시" },
            { "sggCode": "41460", "sggName": "용인시" },
            { "sggCode": "41480", "sggName": "파주시" },
            { "sggCode": "41500", "sggName": "이천시" },
            { "sggCode": "41550", "sggName": "안성시" },
            { "sggCode": "41570", "sggName": "김포시" },
            { "sggCode": "41590", "sggName": "화성시" },
            { "sggCode": "41610", "sggName": "광주시" },
            { "sggCode": "41630", "sggName": "양주시" },
            { "sggCode": "41650", "sggName": "포천시" },
            { "sggCode": "41670", "sggName": "여주시" },
            { "sggCode": "41800", "sggName": "연천군" },
            { "sggCode": "41820", "sggName": "가평군" },
            { "sggCode": "41830", "sggName": "양평군" }
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
                    let body = '';
                    res.on('data', d => body += d);
                    res.on('end', () => resolve(body));
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

function fetchTenureHtml(sidoCode, sggCode) {
    return new Promise((resolve, reject) => {
        const url = `https://e-childschoolinfo.moe.go.kr/api/notice/excelDownload/yearOfWork.do?key=${API_KEY}&sidoCode=${sidoCode}&sggCode=${sggCode}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(data));
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

    return rawList.map((item, index) => {
        const name = item.kindername || item.schul_nm || item.name || '-';
        const establishField = item.establish || item.fond_sc_nm || item.type || '';
        const address = item.addr || item.adres || '-';
        const lat = parseFloat(item.lttdcdnt || item.la || item.lat) || 0;
        const lng = parseFloat(item.lngtcdnt || item.lo || item.lng) || 0;
        const phone = item.telno || item.tel || '-';

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
    });
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

function fetchChildcareApi(sggCode) {
    return new Promise((resolve, reject) => {
        const url = `http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=${CHILDCARE_API_KEY}&arcode=${sggCode}`;
        http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(data));
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
    return items
        .filter(item => {
            const status = item.crstatusname || '';
            return status === '정상' || status === '재개' || status === '';
        })
        .map((item, index) => {
            const id = item.stcode || String(index + 1);
            const name = item.crname || '-';
            const type = mapChildcareType(item.crtypename);
            const address = item.craddr || '-';
            const lat = parseFloat(item.la) || 0;
            const lng = parseFloat(item.lo) || 0;
            const phone = item.crtelno || '-';
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
            // CLASS_CNT_M2: 0~2세 혼합반, CLASS_CNT_M5: 0~5세 혼합반
            const ageSet = new Set();
            if (parseInt(item.CLASS_CNT_00) > 0) ageSet.add(0);
            if (parseInt(item.CLASS_CNT_01) > 0) ageSet.add(1);
            if (parseInt(item.CLASS_CNT_02) > 0) ageSet.add(2);
            if (parseInt(item.CLASS_CNT_03) > 0) ageSet.add(3);
            if (parseInt(item.CLASS_CNT_04) > 0) ageSet.add(4);
            if (parseInt(item.CLASS_CNT_05) > 0) ageSet.add(5);
            if (parseInt(item.CLASS_CNT_M2) > 0) [0, 1, 2].forEach(a => ageSet.add(a));
            if (parseInt(item.CLASS_CNT_M5) > 0) [0, 1, 2, 3, 4, 5].forEach(a => ageSet.add(a));
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
                teacherTenure,
                waitlistTotal,
                cctvCount,
                specialPrograms: specialPrograms === '-' ? undefined : specialPrograms,
                alimiUrl,
                tags: buildChildcareTags(specialPrograms, hasSchoolBus),
            };
        });
}

async function run() {
    try {
        const dataDir = path.resolve(__dirname, '../public/data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(path.join(dataDir, 'regions.json'), JSON.stringify(REGIONS, null, 2), 'utf-8');
        console.log('✅ Generated regions.json metadata.');

        for (const sido of REGIONS) {
            for (const sgg of sido.sggList) {
                console.log(`Fetching data for ${sido.sidoName} ${sgg.sggName}...`);
                const [basicInfo, teachersInfo, afterSchoolData, schoolBusData, mealData, safetyData, , tenureHtml] = await Promise.all([
                    fetchApi('basicInfo2', sido.sidoCode, sgg.sggCode),
                    fetchApi('teachersInfo', sido.sidoCode, sgg.sggCode).catch(() => null),
                    fetchApi('afterSchoolPresent', sido.sidoCode, sgg.sggCode).catch(() => null),
                    fetchApi('schoolBus', sido.sidoCode, sgg.sggCode).catch(() => null),
                    fetchApi('schoolMeal', sido.sidoCode, sgg.sggCode).catch(() => null),
                    fetchApi('safetyEdu', sido.sidoCode, sgg.sggCode).catch(() => null),
                    fetchApi('environmentHygiene', sido.sidoCode, sgg.sggCode).catch(() => null),
                    fetchTenureHtml(sido.sidoCode, sgg.sggCode).catch(() => '')
                ]);

                const tenureMap = parseTenureTable(tenureHtml);
                const spclMap = extractSpclMap(afterSchoolData);
                const mealMap = extractMap(mealData);
                const safetyMap = extractMap(safetyData);

                const normalizedList = normalizeData(basicInfo, teachersInfo, tenureMap, schoolBusData, mealMap, safetyMap, sido.sidoCode, sgg.sggCode);

                normalizedList.forEach(inst => {
                    const programs = spclMap.get(inst.id);
                    inst.specialPrograms = programs ? programs.join(', ') : '-';
                });

                const filename = `${sido.sidoCode}_${sgg.sggCode}.json`;
                fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(normalizedList, null, 2), 'utf-8');
                console.log(`✅ Saved ${normalizedList.length} institutions to ${filename}`);

                await delay(2000);
            }
        }

        console.log('🎉 All kindergarten data successfully split and written!');

        // =============================================
        // 어린이집 데이터 수집
        // =============================================
        if (CHILDCARE_API_KEY) {
            console.log('\n📦 Starting childcare data collection...');
            for (const sido of REGIONS) {
                for (const sgg of sido.sggList) {
                    console.log(`[어린이집] Fetching data for ${sido.sidoName} ${sgg.sggName}...`);
                    try {
                        const xml = await fetchChildcareApi(sgg.sggCode);

                        if (xml.includes('ERROR') || xml.includes('INFO-') || xml.includes('traffic')) {
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
                        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(normalizedList, null, 2), 'utf-8');
                        console.log(`   ✅ Saved ${normalizedList.length} childcare centers to ${filename}`);

                        await delay(2000);
                    } catch (err) {
                        console.error(`   ❌ Error fetching childcare data for ${sgg.sggName}:`, err.message);
                    }
                }
            }
            console.log('🎉 All childcare data successfully collected!');
        }
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
        process.exit(1);
    }
}

run();
