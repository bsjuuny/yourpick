const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../public/data');
const OUT_FILE = path.join(DATA_DIR, 'region-ranking.json');

function emptyBucket() {
    return { count: 0, capacity: 0, currentPupils: 0 };
}

function addToBucket(bucket, inst) {
    if (!(inst.capacity > 0) || !(inst.currentPupils >= 0)) return;
    bucket.count += 1;
    bucket.capacity += inst.capacity;
    bucket.currentPupils += inst.currentPupils;
}

function withFillRate(bucket) {
    return {
        ...bucket,
        fillRate: bucket.capacity > 0 ? bucket.currentPupils / bucket.capacity : null,
    };
}

function buildRanking() {
    const regionsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'regions.json'), 'utf-8'));
    const regionNames = new Map(); // `${sidoCode}_${sggCode}` -> { sidoName, sggName }
    for (const sido of regionsRaw) {
        for (const sgg of sido.sggList) {
            regionNames.set(`${sido.sidoCode}_${sgg.sggCode}`, { sidoName: sido.sidoName, sggName: sgg.sggName });
        }
    }

    const regions = [];

    for (const [key, names] of regionNames) {
        const [sidoCode, sggCode] = key.split('_');
        const kindergartenFile = path.join(DATA_DIR, `${key}.json`);
        const childcareFile = path.join(DATA_DIR, `${key}_childcare.json`);

        const kindergarten = emptyBucket();
        const childcare = emptyBucket();

        if (fs.existsSync(kindergartenFile)) {
            const list = JSON.parse(fs.readFileSync(kindergartenFile, 'utf-8'));
            list.forEach(inst => addToBucket(kindergarten, inst));
        }
        if (fs.existsSync(childcareFile)) {
            const list = JSON.parse(fs.readFileSync(childcareFile, 'utf-8'));
            list.forEach(inst => addToBucket(childcare, inst));
        }

        const combined = {
            count: kindergarten.count + childcare.count,
            capacity: kindergarten.capacity + childcare.capacity,
            currentPupils: kindergarten.currentPupils + childcare.currentPupils,
        };

        // 데이터가 전혀 없는 지역(정원 0)은 랭킹에서 제외 — 비교 의미가 없음
        if (combined.capacity === 0) continue;

        regions.push({
            sidoCode,
            sggCode,
            sidoName: names.sidoName,
            sggName: names.sggName,
            kindergarten: withFillRate(kindergarten),
            childcare: withFillRate(childcare),
            combined: withFillRate(combined),
        });
    }

    regions.sort((a, b) => (b.combined.fillRate ?? 0) - (a.combined.fillRate ?? 0));

    const output = {
        generatedAt: new Date().toISOString(),
        regionCount: regions.length,
        regions,
    };

    fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✅ region-ranking.json 생성 완료 (${regions.length}개 지역)`);
}

buildRanking();
