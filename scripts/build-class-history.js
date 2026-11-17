/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
/**
 * 연령반 이력 (2026-11-17).
 *
 * 공공 API는 현재 공시만 준다(과거 공시차수 요청은 무시됨, 2026-11-17 확인). 그래서 이력은 우리가 모은
 * 스냅샷으로만 만든다:
 *   - 처음 한 번 `--bootstrap`: 저장소 git 이력의 어린이집 연령별 반 수(2026-03-31 수집분부터).
 *     당시에는 혼합반·특수반을 저장하지 않았으므로 mixed/special 은 null(모름)이다.
 *   - 그 뒤로는 수집할 때마다(월간 갱신) 현재 값을 덧붙이고, 값이 같으면 기간(to)만 늘린다.
 *
 * 출력: public/data/class-history/{sido}_{sgg}.json
 *   { "<출처>:<id>": [{ from, to, basis, classes:[만0..만5 | null], mixed, special, origin }] }
 * classes 의 null = 그 연령은 해당 없음(유치원 만0~2세) 또는 당시 정보 없음.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'public/data');
const outDir = path.join(dataDir, 'class-history');
const BOOTSTRAP = process.argv.includes('--bootstrap');

function today() {
    const kst = new Date(Date.now() + 9 * 3600 * 1000);
    return kst.toISOString().slice(0, 10);
}

/** 현재 데이터 한 기관 → 이력 한 칸 */
function entryFromCurrent(inst, date) {
    const ac = inst.ageClasses;
    if (!ac) return null;
    const ages = inst.source === '유치원' ? [3, 4, 5] : [0, 1, 2, 3, 4, 5];
    const classes = [0, 1, 2, 3, 4, 5].map(a => (ages.includes(a) ? (ac.byAge?.[a]?.classes ?? 0) : null));
    return {
        from: date,
        to: date,
        basis: ac.basis?.label ?? null,
        classes,
        mixed: (ac.mixed ?? []).reduce((sum, m) => sum + (m.classes || 0), 0),
        special: ac.special?.classes ?? 0,
        origin: 'collect',
    };
}

/** 예전 스냅샷의 어린이집 ageBreakdown → 이력 한 칸 (혼합반·특수반은 모름) */
function entryFromLegacy(inst, date) {
    if (inst.source !== '어린이집' && !String(inst.id).match(/^\d{11}$/)) return null;
    if (!inst.ageBreakdown) return null;
    const classes = [0, 1, 2, 3, 4, 5].map(a => inst.ageBreakdown[a]?.classes ?? 0);
    return { from: date, to: date, basis: `${date} 수집 (저장 스냅샷)`, classes, mixed: null, special: null, origin: 'git' };
}

function sameValues(a, b) {
    return JSON.stringify(a.classes) === JSON.stringify(b.classes) && a.mixed === b.mixed && a.special === b.special;
}

/**
 * 기록 덧붙이기. 값이 같으면 기간(to)만 늘린다(prevTo 에 직전 끝 날짜를 남겨 둔다).
 * 같은 날 다시 수집했는데 값이 다르면(API 정정 등) 최신 값을 쓴다:
 *   그날만 있는 기록이면 값을 바꾸고, 여러 날에 걸친 기록이면 그날을 떼어 새 기록으로 만든다.
 */
function append(list, entry) {
    const last = list[list.length - 1];
    if (last && entry.from < last.to) return; // 더 오래된 스냅샷은 무시
    if (last && entry.from === last.to) {
        if (sameValues(last, entry)) return;
        if (last.from === last.to) {
            Object.assign(last, { classes: entry.classes, mixed: entry.mixed, special: entry.special, basis: entry.basis ?? last.basis, origin: entry.origin });
            delete last.prevTo;
            return;
        }
        last.to = last.prevTo ?? last.from;
        delete last.prevTo;
        list.push(entry);
        return;
    }
    if (last && sameValues(last, entry)) {
        last.prevTo = last.to;
        last.to = entry.to;
        if (entry.basis) last.basis = entry.basis;
        return;
    }
    list.push(entry);
}

function regionKeys() {
    const regions = JSON.parse(fs.readFileSync(path.join(dataDir, 'regions.json'), 'utf8'));
    return regions.flatMap(s => s.sggList.map(g => `${s.sidoCode}_${g.sggCode}`));
}

function readJson(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function legacySnapshots() {
    // 데이터 파일이 바뀐 커밋들. 날짜가 같으면 마지막 커밋만 쓴다.
    const log = execFileSync('git', ['log', '--format=%H %cs', '--', 'public/data'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
    const byDate = new Map();
    for (const line of log.reverse()) {
        const [hash, date] = line.split(' ');
        byDate.set(date, hash);
    }
    const snapshots = [];
    for (const [date, hash] of byDate) {
        const files = execFileSync('git', ['ls-tree', '--name-only', `${hash}:public/data`], { cwd: root, encoding: 'utf8' })
            .split('\n').filter(f => /_childcare\.json$/.test(f));
        if (files.length === 0) continue;
        const byId = new Map();
        for (const file of files) {
            let list;
            try { list = JSON.parse(execFileSync('git', ['show', `${hash}:public/data/${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })); } catch { continue; }
            for (const inst of list) {
                const entry = entryFromLegacy({ ...inst, source: '어린이집' }, date);
                if (entry) byId.set(String(inst.id), entry);
            }
        }
        if (byId.size > 0) snapshots.push({ date, byId });
    }
    return snapshots;
}

function run() {
    fs.mkdirSync(outDir, { recursive: true });
    const date = today();
    const legacy = BOOTSTRAP ? legacySnapshots() : [];
    if (BOOTSTRAP) console.log(`git snapshots with class counts: ${legacy.map(s => `${s.date}(${s.byId.size})`).join(', ')}`);
    let institutions = 0;
    let withChanges = 0;
    for (const region of regionKeys()) {
        const outFile = path.join(outDir, `${region}.json`);
        const history = (!BOOTSTRAP && readJson(outFile)) || {};
        const current = [
            ...(readJson(path.join(dataDir, `${region}.json`)) || []),
            ...(readJson(path.join(dataDir, `${region}_childcare.json`)) || []),
        ];
        const next = {};
        for (const inst of current) {
            const key = `${inst.source}:${inst.id}`;
            const list = (history[key] || []).map(e => ({ ...e }));
            if (BOOTSTRAP && inst.source === '어린이집') {
                for (const snap of legacy) {
                    const old = snap.byId.get(String(inst.id));
                    if (old && snap.date < date) append(list, { ...old });
                }
            }
            const entry = entryFromCurrent(inst, date);
            if (entry) append(list, entry);
            if (list.length > 0) next[key] = list;
            institutions++;
            if (list.length > 1) withChanges++;
        }
        fs.writeFileSync(outFile, JSON.stringify(next) + '\n', 'utf8');
    }
    console.log(`✅ class history: ${institutions} institutions, ${withChanges} with more than one recorded state (${date})`);
}

module.exports = { entryFromCurrent, entryFromLegacy, append, sameValues };
if (require.main === module) run();
