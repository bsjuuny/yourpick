/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const { main } = require('./preflight-data-fetch');

// Keep the historical helper, but use the same .env.local loader and safe output as collection.
main(['--only=childcare']).catch((error) => {
    console.error(`❌ 어린이집 API 테스트 실패: ${error.message}`);
    process.exitCode = error.exitCode || 1;
});
