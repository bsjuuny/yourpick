/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS helper. */
const http = require('http');
const https = require('https');
const { ENV_NAMES } = require('./api-environment');

class PreflightError extends Error {
    constructor(message, exitCode) {
        super(message);
        this.name = 'PreflightError';
        this.exitCode = exitCode;
    }
}

function assertRequiredConfiguration(config, selection) {
    const missing = [];
    if (selection.kindergarten && !config.kindergartenKey) missing.push(ENV_NAMES.kindergarten);
    if (selection.childcare && !config.childcareKey) missing.push(ENV_NAMES.childcare);
    if (missing.length > 0) {
        throw new PreflightError(`필수 환경변수가 없습니다: ${missing.join(', ')}`, 2);
    }
}

function classifyKindergartenResponse(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { kind: 'fatal', reason: 'unexpected-response' };
    }

    const errorText = Object.entries(payload)
        .filter(([key]) => /error|code|message|result/i.test(key))
        .map(([, value]) => String(value))
        .join(' ');
    if (/인증|auth|invalid|만료|expired|초과|quota|error|fail/i.test(errorText)) {
        return { kind: 'fatal', reason: 'api-rejected' };
    }

    const info = payload.kinderInfo;
    if (Array.isArray(info) || (info !== null && typeof info === 'object')) {
        return { kind: 'ok', reason: null };
    }
    return { kind: 'fatal', reason: 'unexpected-response' };
}

function classifyChildcareResponse(xml) {
    const match = String(xml).match(/(INFO|ERROR)\s*-\s*(\d{3})/);
    if (!match) return { kind: 'ok', code: null };
    const code = `${match[1]}-${match[2]}`;
    if (code === 'INFO-200') return { kind: 'no-result', code };
    return { kind: 'fatal', code };
}

function requestText(url, transport, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const request = transport.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            const chunks = [];
            response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            response.on('aborted', () => reject(new PreflightError('API 응답이 중단되었습니다.', 3)));
            response.on('error', () => reject(new PreflightError('API 응답을 읽지 못했습니다.', 3)));
            response.on('end', () => {
                if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new PreflightError(`API가 HTTP ${response.statusCode || '오류'}로 응답했습니다.`, 3));
                    return;
                }
                resolve(Buffer.concat(chunks).toString('utf8'));
            });
        });
        request.setTimeout(timeoutMs, () => request.destroy(new Error('timeout')));
        request.on('error', () => reject(new PreflightError('API 연결을 확인할 수 없습니다.', 3)));
    });
}

function createLiveChecks(config) {
    return {
        requestKindergarten: async () => {
            const url = new URL('https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do');
            url.searchParams.set('key', config.kindergartenKey);
            url.searchParams.set('sidoCode', '11');
            url.searchParams.set('sggCode', '11110');
            const body = await requestText(url, https);
            try {
                return JSON.parse(body);
            } catch {
                throw new PreflightError('유치원 API 응답 형식을 확인할 수 없습니다.', 3);
            }
        },
        requestChildcare: async () => {
            const url = new URL('http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request');
            url.searchParams.set('key', config.childcareKey);
            url.searchParams.set('arcode', '11110');
            return requestText(url, http);
        },
    };
}

async function runPreflight({ config, selection, checks }) {
    // Configuration must fail before a network request or filesystem write can occur.
    assertRequiredConfiguration(config, selection);
    const liveChecks = checks || createLiveChecks(config);
    const results = {};

    if (selection.kindergarten) {
        const payload = await liveChecks.requestKindergarten();
        const verdict = classifyKindergartenResponse(payload);
        if (verdict.kind !== 'ok') {
            throw new PreflightError('유치원 API 인증 또는 응답 상태를 확인하지 못했습니다.', 3);
        }
        results.kindergarten = 'ok';
    }

    if (selection.childcare) {
        const xml = await liveChecks.requestChildcare();
        const verdict = classifyChildcareResponse(xml);
        if (verdict.kind === 'fatal') {
            throw new PreflightError(`어린이집 API 인증에 실패했습니다 (${verdict.code}).`, 3);
        }
        results.childcare = 'ok';
    }

    return results;
}

module.exports = {
    PreflightError,
    assertRequiredConfiguration,
    classifyKindergartenResponse,
    classifyChildcareResponse,
    createLiveChecks,
    runPreflight,
};
