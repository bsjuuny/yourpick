/**
 * add-age-breakdown.js
 * 기존 *_childcare.json 파일에 연령별 원아/반 수(ageBreakdown) 필드를 추가
 * 어린이집 API(cpmsapi030)에서 CHILD_CNT_00~05 / CLASS_CNT_00~05 를 가져와 매칭
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const CHILDCARE_API_KEY = process.env.CHILDCARE_API_KEY;
if (!CHILDCARE_API_KEY) {
    console.error('❌ CHILDCARE_API_KEY is not set in .env.local');
    process.exit(1);
}

const DATA_DIR = path.resolve(__dirname, '../public/data');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        const innerXml = itemXml.substring(itemXml.indexOf('>') + 1, itemXml.lastIndexOf('</'));
        const tagMatches = innerXml.matchAll(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g);
        for (const m of tagMatches) {
            obj[m[1].trim()] = m[2].trim();
        }
        items.push(obj);
    }
    return items;
}

function buildAgeBreakdown(item) {
    const breakdown = {};
    for (let age = 0; age <= 5; age++) {
        const childCount = parseInt(item[`CHILD_CNT_0${age}`]) || 0;
        const classCount = parseInt(item[`CLASS_CNT_0${age}`]) || 0;
        if (classCount > 0) {
            breakdown[age] = {
                children: childCount,
                classes: classCount,
                ratio: Number((childCount / classCount).toFixed(1)),
            };
        }
    }
    return Object.keys(breakdown).length > 0 ? breakdown : undefined;
}

async function run() {
    // 처리할 *_childcare.json 파일 목록
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('_childcare.json'));

    for (const file of files) {
        // 파일명에서 sggCode 추출 (예: 11_11110_childcare.json → 11110)
        const match = file.match(/^\d+_(\d+)_childcare\.json$/);
        if (!match) continue;
        const sggCode = match[1];

        console.log(`[${file}] API 요청 중...`);
        try {
            const xml = await fetchChildcareApi(sggCode);

            if (xml.includes('ERROR') || xml.includes('INFO-') || xml.includes('traffic')) {
                console.warn(`  ⚠️ API 오류 응답 — 건너뜀`);
                await delay(5000);
                continue;
            }

            const rawItems = parseXmlItems(xml);
            // stcode → ageBreakdown 맵 생성
            const breakdownMap = new Map();
            for (const item of rawItems) {
                const id = item.stcode;
                if (id) {
                    const bd = buildAgeBreakdown(item);
                    if (bd) breakdownMap.set(id, bd);
                }
            }

            // 기존 JSON 읽고 ageBreakdown 주입
            const filePath = path.join(DATA_DIR, file);
            const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            let updated = 0;
            for (const inst of existing) {
                const bd = breakdownMap.get(inst.id);
                if (bd) {
                    inst.ageBreakdown = bd;
                    updated++;
                }
            }

            fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
            console.log(`  ✅ ${updated}/${existing.length}개 기관에 ageBreakdown 추가`);

            await delay(1500);
        } catch (err) {
            console.error(`  ❌ 오류: ${err.message}`);
        }
    }

    console.log('\n🎉 완료');
}

run();
