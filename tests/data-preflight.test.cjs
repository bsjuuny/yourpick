/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner entry point. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadApiEnvironment, parseSourceSelection } = require('../scripts/api-environment');
const {
    assertRequiredConfiguration,
    classifyKindergartenResponse,
    runPreflight,
} = require('../scripts/data-preflight');

test('default collection requires both sources; partial collection must be explicit', () => {
    assert.deepEqual(parseSourceSelection([]), { kindergarten: true, childcare: true, mode: 'all' });
    assert.deepEqual(parseSourceSelection(['--only=kindergarten']), { kindergarten: true, childcare: false, mode: 'kindergarten' });
    assert.deepEqual(parseSourceSelection(['--only=childcare']), { kindergarten: false, childcare: true, mode: 'childcare' });
    assert.throws(() => parseSourceSelection(['--skip-childcare']), /알 수 없는 옵션/);
    assert.throws(() => parseSourceSelection(['--only=kindergarten', '--only=childcare']), /하나만/);
});

test('.env.local loading is shared and existing environment variables keep precedence', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yourpick-env-'));
    const envFile = path.join(dir, '.env.local');
    fs.writeFileSync(envFile, 'NEXT_PUBLIC_CHILDINFO_API_KEY=file-kinder\nCHILDCARE_API_KEY=file-childcare\n');
    try {
        const loaded = loadApiEnvironment({ envFile, env: { CHILDCARE_API_KEY: 'runtime-childcare' } });
        assert.equal(loaded.kindergartenKey, 'file-kinder');
        assert.equal(loaded.childcareKey, 'runtime-childcare');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('missing configuration fails before any API request, without exposing a key', async () => {
    let requests = 0;
    const checks = {
        requestKindergarten: async () => { requests++; return { kinderInfo: [] }; },
        requestChildcare: async () => { requests++; return '<response />'; },
    };
    await assert.rejects(
        runPreflight({
            config: { kindergartenKey: 'secret-kindergarten', childcareKey: '' },
            selection: parseSourceSelection([]),
            checks,
        }),
        (error) => error.exitCode === 2 && !error.message.includes('secret-kindergarten') && /CHILDCARE_API_KEY/.test(error.message),
    );
    assert.equal(requests, 0);
});

test('explicit partial mode requires and checks only the selected source', async () => {
    assert.doesNotThrow(() => assertRequiredConfiguration(
        { kindergartenKey: 'kindergarten-key', childcareKey: '' },
        parseSourceSelection(['--only=kindergarten']),
    ));
    let childcareCalled = false;
    const result = await runPreflight({
        config: { kindergartenKey: 'kindergarten-key', childcareKey: '' },
        selection: parseSourceSelection(['--only=kindergarten']),
        checks: {
            requestKindergarten: async () => ({ kinderInfo: [{ kindercode: 'test' }] }),
            requestChildcare: async () => { childcareCalled = true; return ''; },
        },
    });
    assert.deepEqual(result, { kindergarten: 'ok' });
    assert.equal(childcareCalled, false);
});

test('mock API responses reject authentication failures and accept valid schemas', async () => {
    assert.equal(classifyKindergartenResponse({ kinderInfo: [] }).kind, 'ok');
    assert.equal(classifyKindergartenResponse({ kinderInfo: 'invalid key' }).kind, 'fatal');
    assert.equal(classifyKindergartenResponse({ resultCode: 'AUTH_ERROR', message: 'invalid key' }).kind, 'fatal');

    const selection = parseSourceSelection([]);
    const config = { kindergartenKey: 'never-print-k', childcareKey: 'never-print-c' };
    const ok = await runPreflight({
        config,
        selection,
        checks: {
            requestKindergarten: async () => ({ kinderInfo: [{ kindercode: 'K1' }] }),
            requestChildcare: async () => '<response><item><stcode>C1</stcode></item></response>',
        },
    });
    assert.deepEqual(ok, { kindergarten: 'ok', childcare: 'ok' });

    await assert.rejects(
        runPreflight({
            config,
            selection,
            checks: {
                requestKindergarten: async () => ({ kinderInfo: [] }),
                requestChildcare: async () => '<response><errcode>INFO-400</errcode></response>',
            },
        }),
        (error) => error.exitCode === 3
            && /INFO-400/.test(error.message)
            && !error.message.includes(config.kindergartenKey)
            && !error.message.includes(config.childcareKey),
    );
});

test('a missing key exits before touching existing data or fetch history', () => {
    const root = path.resolve(__dirname, '..');
    const manifest = path.join(root, 'public/data/fetch-manifest.json');
    const before = crypto.createHash('sha256').update(fs.readFileSync(manifest)).digest('hex');
    const { run } = require('../scripts/fetch-data');
    return assert.rejects(
        run([], {
            config: { kindergartenKey: '', childcareKey: '' },
            checks: {
                requestKindergarten: async () => assert.fail('must not request kindergarten API'),
                requestChildcare: async () => assert.fail('must not request childcare API'),
            },
        }),
        (error) => {
            const after = crypto.createHash('sha256').update(fs.readFileSync(manifest)).digest('hex');
            assert.equal(error.exitCode, 2);
            assert.equal(after, before);
            assert.doesNotMatch(error.message, /key=[^&\s]+/i);
            return true;
        },
    );
});

test('staged collection rejects a large regional count drop before commit', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yourpick-stage-'));
    const existing = path.join(root, 'existing');
    const staged = path.join(root, 'staged');
    fs.mkdirSync(existing);
    fs.mkdirSync(staged);
    const regions = [{ sidoCode: '11', sidoName: '서울특별시', sggList: [{ sggCode: '11110', sggName: '종로구' }] }];
    const records = (count, source) => Array.from({ length: count }, (_, index) => ({
        id: `${source === '유치원' ? 'K' : 'C'}${1000 + index}`,
        name: `${source} 테스트 ${index + 1}`,
        address: '서울특별시 종로구 테스트로 1',
        source,
    }));
    fs.writeFileSync(path.join(staged, 'regions.json'), JSON.stringify(regions));
    fs.writeFileSync(path.join(existing, '11_11110.json'), JSON.stringify(records(10, '유치원')));
    fs.writeFileSync(path.join(existing, '11_11110_childcare.json'), JSON.stringify(records(10, '어린이집')));
    fs.writeFileSync(path.join(staged, '11_11110.json'), JSON.stringify(records(5, '유치원')));
    fs.writeFileSync(path.join(staged, '11_11110_childcare.json'), JSON.stringify(records(10, '어린이집')));
    try {
        const { validateStagedCollection } = require('../scripts/fetch-data');
        assert.throws(() => validateStagedCollection(staged, existing), /기관 수 감소 검증/);
        fs.writeFileSync(path.join(staged, '11_11110.json'), JSON.stringify(records(10, '유치원')));
        assert.doesNotThrow(() => validateStagedCollection(staged, existing));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('static build remains independent from API collection', () => {
    const pkg = require('../package.json');
    assert.doesNotMatch(pkg.scripts['build:static'], /fetch-data|data:fetch|preflight/);
});
