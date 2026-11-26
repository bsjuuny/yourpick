/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const { loadApiEnvironment, parseSourceSelection } = require('./api-environment');
const { runPreflight } = require('./data-preflight');

async function main(args = process.argv.slice(2)) {
    const selection = parseSourceSelection(args);
    const config = loadApiEnvironment();
    console.log(`🔎 수집 사전 검증 시작 (대상: ${selection.mode})`);
    await runPreflight({ config, selection });
    console.log('✅ 필수 환경설정과 API 인증 상태가 정상입니다. 데이터 파일은 변경하지 않았습니다.');
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`❌ 사전 검증 실패: ${error.message}`);
        process.exitCode = error.exitCode || 1;
    });
}

module.exports = { main };
