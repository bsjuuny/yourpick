/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS helper. */
const path = require('path');
const dotenv = require('dotenv');

const ENV_NAMES = Object.freeze({
    kindergarten: 'NEXT_PUBLIC_CHILDINFO_API_KEY',
    childcare: 'CHILDCARE_API_KEY',
});

function loadApiEnvironment(options = {}) {
    const envFile = options.envFile || path.resolve(__dirname, '../.env.local');
    const loaded = { ...(options.env || process.env) };

    // Use a separate object so importing a script does not unexpectedly mutate process.env.
    // Existing environment variables keep precedence over .env.local, matching dotenv's default.
    dotenv.config({ path: envFile, processEnv: loaded, quiet: true });

    return {
        kindergartenKey: loaded[ENV_NAMES.kindergarten]?.trim() || '',
        childcareKey: loaded[ENV_NAMES.childcare]?.trim() || '',
        envFile,
    };
}

function parseSourceSelection(args = []) {
    let only = null;
    for (const arg of args) {
        if (arg === '--only=kindergarten' || arg === '--only=childcare') {
            if (only) throw new Error('수집 대상 옵션은 하나만 지정할 수 있습니다.');
            only = arg.slice('--only='.length);
            continue;
        }
        throw new Error(`알 수 없는 옵션입니다: ${arg}`);
    }

    return {
        kindergarten: only !== 'childcare',
        childcare: only !== 'kindergarten',
        mode: only || 'all',
    };
}

module.exports = { ENV_NAMES, loadApiEnvironment, parseSourceSelection };
