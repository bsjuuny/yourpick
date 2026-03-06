/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const API_KEY = process.env.NEXT_PUBLIC_CHILDINFO_API_KEY;

if (!API_KEY) {
    console.error('❌ NEXT_PUBLIC_CHILDINFO_API_KEY is not set in .env.local');
    process.exit(1);
}

const REGIONS = [
    {
        "sidoCode": "11",
        "sidoName": "서울특별시",
        "sggList": [
            {
                "sggCode": "11110",
                "sggName": "종로구"
            },
            {
                "sggCode": "11140",
                "sggName": "중구"
            },
            {
                "sggCode": "11170",
                "sggName": "용산구"
            },
            {
                "sggCode": "11200",
                "sggName": "성동구"
            },
            {
                "sggCode": "11215",
                "sggName": "광진구"
            },
            {
                "sggCode": "11230",
                "sggName": "동대문구"
            },
            {
                "sggCode": "11260",
                "sggName": "중랑구"
            },
            {
                "sggCode": "11290",
                "sggName": "성북구"
            },
            {
                "sggCode": "11305",
                "sggName": "강북구"
            },
            {
                "sggCode": "11320",
                "sggName": "도봉구"
            },
            {
                "sggCode": "11350",
                "sggName": "노원구"
            },
            {
                "sggCode": "11380",
                "sggName": "은평구"
            },
            {
                "sggCode": "11410",
                "sggName": "서대문구"
            },
            {
                "sggCode": "11440",
                "sggName": "마포구"
            },
            {
                "sggCode": "11470",
                "sggName": "양천구"
            },
            {
                "sggCode": "11500",
                "sggName": "강서구"
            },
            {
                "sggCode": "11530",
                "sggName": "구로구"
            },
            {
                "sggCode": "11545",
                "sggName": "금천구"
            },
            {
                "sggCode": "11560",
                "sggName": "영등포구"
            },
            {
                "sggCode": "11590",
                "sggName": "동작구"
            },
            {
                "sggCode": "11620",
                "sggName": "관악구"
            },
            {
                "sggCode": "11650",
                "sggName": "서초구"
            },
            {
                "sggCode": "11680",
                "sggName": "강남구"
            },
            {
                "sggCode": "11710",
                "sggName": "송파구"
            },
            {
                "sggCode": "11740",
                "sggName": "강동구"
            }
        ]
    },
    {
        "sidoCode": "26",
        "sidoName": "부산광역시",
        "sggList": [
            {
                "sggCode": "26110",
                "sggName": "중구"
            },
            {
                "sggCode": "26140",
                "sggName": "서구"
            },
            {
                "sggCode": "26170",
                "sggName": "동구"
            },
            {
                "sggCode": "26200",
                "sggName": "영도구"
            },
            {
                "sggCode": "26230",
                "sggName": "부산진구"
            },
            {
                "sggCode": "26260",
                "sggName": "동래구"
            },
            {
                "sggCode": "26290",
                "sggName": "남구"
            },
            {
                "sggCode": "26320",
                "sggName": "북구"
            },
            {
                "sggCode": "26350",
                "sggName": "해운대구"
            },
            {
                "sggCode": "26380",
                "sggName": "사하구"
            },
            {
                "sggCode": "26410",
                "sggName": "금정구"
            },
            {
                "sggCode": "26440",
                "sggName": "강서구"
            },
            {
                "sggCode": "26470",
                "sggName": "연제구"
            },
            {
                "sggCode": "26500",
                "sggName": "수영구"
            },
            {
                "sggCode": "26530",
                "sggName": "사상구"
            },
            {
                "sggCode": "26710",
                "sggName": "기장군"
            }
        ]
    },
    {
        "sidoCode": "27",
        "sidoName": "대구광역시",
        "sggList": [
            {
                "sggCode": "27110",
                "sggName": "중구"
            },
            {
                "sggCode": "27140",
                "sggName": "동구"
            },
            {
                "sggCode": "27170",
                "sggName": "서구"
            },
            {
                "sggCode": "27200",
                "sggName": "남구"
            },
            {
                "sggCode": "27230",
                "sggName": "북구"
            },
            {
                "sggCode": "27260",
                "sggName": "수성구"
            },
            {
                "sggCode": "27290",
                "sggName": "달서구"
            },
            {
                "sggCode": "27710",
                "sggName": "달성군"
            },
            {
                "sggCode": "27720",
                "sggName": "군위군"
            }
        ]
    },
    {
        "sidoCode": "28",
        "sidoName": "인천광역시",
        "sggList": [
            {
                "sggCode": "28110",
                "sggName": "중구"
            },
            {
                "sggCode": "28140",
                "sggName": "동구"
            },
            {
                "sggCode": "28177",
                "sggName": "미추홀구"
            },
            {
                "sggCode": "28185",
                "sggName": "연수구"
            },
            {
                "sggCode": "28200",
                "sggName": "남동구"
            },
            {
                "sggCode": "28237",
                "sggName": "부평구"
            },
            {
                "sggCode": "28245",
                "sggName": "계양구"
            },
            {
                "sggCode": "28260",
                "sggName": "서구"
            },
            {
                "sggCode": "28710",
                "sggName": "강화군"
            },
            {
                "sggCode": "28720",
                "sggName": "옹진군"
            }
        ]
    },
    {
        "sidoCode": "29",
        "sidoName": "광주광역시",
        "sggList": [
            {
                "sggCode": "29110",
                "sggName": "동구"
            },
            {
                "sggCode": "29140",
                "sggName": "서구"
            },
            {
                "sggCode": "29155",
                "sggName": "남구"
            },
            {
                "sggCode": "29170",
                "sggName": "북구"
            },
            {
                "sggCode": "29200",
                "sggName": "광산구"
            }
        ]
    },
    {
        "sidoCode": "30",
        "sidoName": "대전광역시",
        "sggList": [
            {
                "sggCode": "30110",
                "sggName": "동구"
            },
            {
                "sggCode": "30140",
                "sggName": "중구"
            },
            {
                "sggCode": "30170",
                "sggName": "서구"
            },
            {
                "sggCode": "30200",
                "sggName": "유성구"
            },
            {
                "sggCode": "30230",
                "sggName": "대덕구"
            }
        ]
    },
    {
        "sidoCode": "31",
        "sidoName": "울산광역시",
        "sggList": [
            {
                "sggCode": "31110",
                "sggName": "중구"
            },
            {
                "sggCode": "31140",
                "sggName": "남구"
            },
            {
                "sggCode": "31170",
                "sggName": "동구"
            },
            {
                "sggCode": "31200",
                "sggName": "북구"
            },
            {
                "sggCode": "31710",
                "sggName": "울주군"
            }
        ]
    },
    {
        "sidoCode": "36",
        "sidoName": "세종특별자치시",
        "sggList": [
            {
                "sggCode": "36110",
                "sggName": "세종시"
            }
        ]
    },
    {
        "sidoCode": "41",
        "sidoName": "경기도",
        "sggList": [
            {
                "sggCode": "41110",
                "sggName": "수원시"
            },
            {
                "sggCode": "41130",
                "sggName": "성남시"
            },
            {
                "sggCode": "41150",
                "sggName": "의정부시"
            },
            {
                "sggCode": "41170",
                "sggName": "안양시"
            },
            {
                "sggCode": "41190",
                "sggName": "부천시"
            },
            {
                "sggCode": "41210",
                "sggName": "광명시"
            },
            {
                "sggCode": "41220",
                "sggName": "평택시"
            },
            {
                "sggCode": "41250",
                "sggName": "동두천시"
            },
            {
                "sggCode": "41270",
                "sggName": "안산시"
            },
            {
                "sggCode": "41280",
                "sggName": "고양시"
            },
            {
                "sggCode": "41290",
                "sggName": "과천시"
            },
            {
                "sggCode": "41310",
                "sggName": "구리시"
            },
            {
                "sggCode": "41360",
                "sggName": "남양주시"
            },
            {
                "sggCode": "41370",
                "sggName": "오산시"
            },
            {
                "sggCode": "41390",
                "sggName": "시흥시"
            },
            {
                "sggCode": "41410",
                "sggName": "군포시"
            },
            {
                "sggCode": "41430",
                "sggName": "의왕시"
            },
            {
                "sggCode": "41450",
                "sggName": "하남시"
            },
            {
                "sggCode": "41460",
                "sggName": "용인시"
            },
            {
                "sggCode": "41480",
                "sggName": "파주시"
            },
            {
                "sggCode": "41500",
                "sggName": "이천시"
            },
            {
                "sggCode": "41550",
                "sggName": "안성시"
            },
            {
                "sggCode": "41570",
                "sggName": "김포시"
            },
            {
                "sggCode": "41590",
                "sggName": "화성시"
            },
            {
                "sggCode": "41610",
                "sggName": "광주시"
            },
            {
                "sggCode": "41630",
                "sggName": "양주시"
            },
            {
                "sggCode": "41650",
                "sggName": "포천시"
            },
            {
                "sggCode": "41670",
                "sggName": "여주시"
            },
            {
                "sggCode": "41800",
                "sggName": "연천군"
            },
            {
                "sggCode": "41820",
                "sggName": "가평군"
            },
            {
                "sggCode": "41830",
                "sggName": "양평군"
            }
        ]
    }
]
    ;

function fetchApi(endpoint, sidoCode, sggCode) {
    return new Promise((resolve, reject) => {
        const url = `https://e-childschoolinfo.moe.go.kr/api/notice/${endpoint}.do?key=${API_KEY}&sidoCode=${sidoCode}&sggCode=${sggCode}`;
        const options = { headers: { 'User-Agent': 'Mozilla/5.0' } };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    if (data.trim().startsWith('<')) throw new Error('HTML returned instead of JSON');
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
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

function normalizeData(basicInfoData, teachersInfoData, tenureMap, schoolBusData, mealMap, safetyMap, hygieneMap, sidoCode, sggCode) {
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
        const name = item.kindername || item.schul_nm || item.name || `기관 ${index + 1}`;
        const establishField = item.establish || item.fond_sc_nm || item.type || '';
        const address = item.addr || item.adres || '주소 미상';
        const lat = item.lttdcdnt || item.la || item.lat || (37.5 + (Math.random() * 0.02 - 0.01));
        const lng = item.lngtcdnt || item.lo || item.lng || (127.0 + (Math.random() * 0.02 - 0.01));
        const phone = item.telno || item.tel || '전화번호 미제공';

        const capacity = parseInt(item.prmstfcnt || item.mstbc || item.capacity || '0', 10);
        const currentPupils = (parseInt(item.ppcnt3 || 0, 10) + parseInt(item.ppcnt4 || 0, 10) + parseInt(item.ppcnt5 || 0, 10) + parseInt(item.mixppcnt || 0, 10) + parseInt(item.shppcnt || 0, 10)) || parseInt(item.ppcnt || item.current || '0', 10);
        const operatingHours = item.opertime || item.time || '09:00~18:00';

        const busInfo = busMap.get(item.kindercode);
        let hasSchoolBus = false;
        if (busInfo) {
            hasSchoolBus = busInfo.vhcl_oprn_yn === 'Y';
        } else {
            hasSchoolBus = item.vhcle_oprn_yn === 'Y' || item.bus === 'Y';
        }

        const uuid = item.kindercode || item.kinderinfoId;
        const alimiUrl = uuid ? `https://e-childschoolinfo.moe.go.kr/kinderMt/kinderViolation.do?ittId=${uuid}` : null;

        let teacherRatio = '정보 없음';
        let childrenPerTeacher = 0;
        const tInfo = teachersMap.get(item.kindercode);
        if (tInfo) {
            const expert = (parseInt(tInfo.hdst_tchr_qacnt) || 0) + (parseInt(tInfo.rgth_gd1_qacnt) || 0);
            const total = expert + (parseInt(tInfo.rgth_gd2_qacnt) || 0) + (parseInt(tInfo.asth_qacnt) || 0);
            if (total > 0) teacherRatio = `${Math.round((expert / total) * 100)}% (${expert}명/${total}명)`;

            // Total classroom teachers = asps_thcnt + gnrl_thcnt + spcn_thcnt + hdst_thcnt
            const classTeachers = (parseInt(tInfo.asps_thcnt) || 0) + (parseInt(tInfo.gnrl_thcnt) || 0) + (parseInt(tInfo.spcn_thcnt) || 0) + (parseInt(tInfo.hdst_thcnt) || 0);
            if (classTeachers > 0) childrenPerTeacher = Number((currentPupils / classTeachers).toFixed(1));
        }

        // Safety summary
        const sInfo = safetyMap ? safetyMap.get(item.kindercode) : null;
        let safetyStatus = '점검 정보 없음';
        if (sInfo) {
            const fire = sInfo.fire_avd_yn === 'Y' ? '소방대피훈련완료' : '';
            const cctv = sInfo.cctv_ist_yn === 'Y' ? 'CCTV설치' : '';
            const gas = sInfo.gas_ck_yn === 'Y' ? '가스점검완료' : '';
            safetyStatus = [fire, cctv, gas].filter(Boolean).join(', ') || '안전 점검 완료';
        }

        // Meal summary
        const mInfo = mealMap ? mealMap.get(item.kindercode) : null;
        let mealStatus = '급식 정보 없음';
        if (mInfo) {
            const way = mInfo.mlsr_oprn_way_tp_cd === '1' ? '직영급식' : '위탁급식';
            const ntrt = mInfo.ntrt_tchr_agmt_yn === 'Y' ? '영양사배치' : '';
            mealStatus = [way, ntrt].filter(Boolean).join(', ');
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
            address,
            latitude: Number(lat),
            longitude: Number(lng),
            phone,
            capacity: isNaN(capacity) ? 0 : capacity,
            currentPupils: isNaN(currentPupils) ? 0 : currentPupils,
            childrenPerTeacher,
            safetyStatus,
            mealStatus,
            operatingHours,
            hasSchoolBus,
            expenseLevel: '정보없음',
            ageRange: '만 3세 ~ 만 5세',
            teacherRatio,
            teacherTenure: tenureMap.get(item.kindercode),
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

async function run() {
    try {
        const dataDir = path.resolve(__dirname, '../public/data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        // Save regions metadata for UI
        fs.writeFileSync(path.join(dataDir, 'regions.json'), JSON.stringify(REGIONS, null, 2), 'utf-8');
        console.log('✅ Generated regions.json metadata.');

        for (const sido of REGIONS) {
            for (const sgg of sido.sggList) {
                console.log(`Fetching data for ${sido.sidoName} ${sgg.sggName}...`);
                const [basicInfo, teachersInfo, afterSchoolData, schoolBusData, mealData, safetyData, hygieneData, tenureHtml] = await Promise.all([
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
                const hygieneMap = extractMap(hygieneData);

                const normalizedList = normalizeData(basicInfo, teachersInfo, tenureMap, schoolBusData, mealMap, safetyMap, hygieneMap, sido.sidoCode, sgg.sggCode);

                normalizedList.forEach(inst => {
                    const programs = spclMap.get(inst.id);
                    inst.specialPrograms = programs ? programs.join(', ') : '정보 없음';
                });

                const filename = `${sido.sidoCode}_${sgg.sggCode}.json`;
                fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(normalizedList, null, 2), 'utf-8');
                console.log(`✅ Saved ${normalizedList.length} institutions to ${filename}`);

                await delay(1000); // polite delay
            }
        }

        console.log('🎉 All regional data successfully split and written!');
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
        process.exit(1);
    }
}

run();
