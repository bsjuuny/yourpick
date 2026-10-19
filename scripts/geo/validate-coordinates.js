/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const boundaries = require('./municipalities.json');
const regions = require('../../public/data/regions.json');

const regionByCode = new Map(regions.flatMap(s => s.sggList.map(r => [r.sggCode, { ...r, ...s, sggList: undefined }])));
const provinceAliases = {
    '11': ['서울특별시', '서울시', '서울'], '26': ['부산광역시', '부산시', '부산'],
    '27': ['대구광역시', '대구시', '대구'], '28': ['인천광역시', '인천시', '인천'],
    '29': ['광주광역시', '광주시', '광주'], '30': ['대전광역시', '대전시', '대전'],
    '31': ['울산광역시', '울산시', '울산'], '36': ['세종특별자치시', '세종시', '세종'],
    '41': ['경기도', '경기'], '43': ['충청북도', '충북'], '44': ['충청남도', '충남'],
    '46': ['전라남도', '전남'], '47': ['경상북도', '경북'], '48': ['경상남도', '경남'],
    '50': ['제주특별자치도', '제주도', '제주'], '51': ['강원특별자치도', '강원도', '강원'],
    '52': ['전북특별자치도', '전라북도', '전북'],
};

function parseCoordinate(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
}

function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
        if (Math.abs(cross) < 1e-12 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj) && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return true;
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

function contains(boundary, lat, lng) {
    if (!boundary) return false;
    const [minX, minY, maxX, maxY] = boundary.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) return false;
    const geometry = boundary.geometry;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return polygons.some(rings => inRing(lng, lat, rings[0]) && !rings.slice(1).some(r => inRing(lng, lat, r)));
}

function inputCoordinates(inst) {
    // Re-audits must retain quarantined evidence, not reinterpret null as zero.
    return inst.locationStatus === 'unconfirmed' && inst.sourceCoordinates
        ? inst.sourceCoordinates : { latitude: inst.latitude ?? null, longitude: inst.longitude ?? null };
}

function addressMatches(inst) {
    const expected = regionByCode.get(inst.sggCode);
    if (!expected || String(inst.sidoCode) !== expected.sidoCode) return false;
    const address = String(inst.address || '').trim().replace(/\s+/g, ' ');
    const alias = provinceAliases[expected.sidoCode]?.find(p => address.startsWith(p + ' '));
    if (!alias) return false;
    const remainder = address.slice(alias.length).trim();
    return expected.sidoCode === '36' || remainder.startsWith(expected.sggName);
}

function assess(inst) {
    const input = inputCoordinates(inst);
    const lat = parseCoordinate(input.latitude), lng = parseCoordinate(input.longitude);
    const reasons = [];
    if (lat === null || lng === null) reasons.push('missing_or_invalid_coordinate');
    else if (lat < 33 || lat > 39.5 || lng < 124 || lng > 132) reasons.push('outside_korea');
    else {
        if (lat === 37.56647 && lng === 126.977963) reasons.push('known_placeholder');
        if (!boundaries[inst.sggCode]) reasons.push('unknown_region');
        else if (!contains(boundaries[inst.sggCode], lat, lng)) reasons.push('region_mismatch');
    }
    if (!addressMatches(inst)) reasons.push('address_region_unconfirmed');
    return { input, lat, lng, reasons };
}

function roadAddressKey(inst) {
    // Building-level address only. Apartment/unit suffixes may legitimately share coordinates.
    const match = String(inst.address || '').match(/([가-힣\d·.]+(?:대로|로|길))\s*(\d+(?:-\d+)?)(?=\s|\(|$)/);
    return match ? `${inst.sggCode}:${match[1]}:${match[2]}` : null;
}

function validateInstitutions(institutions) {
    const assessments = institutions.map(assess);
    const groups = new Map();
    assessments.forEach((a, i) => {
        if (a.lat === null || a.lng === null || a.lat === 0 || a.lng === 0) return;
        const key = `${a.lat},${a.lng}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(i);
    });
    const duplicates = [];
    for (const [coordinate, indexes] of groups) {
        if (indexes.length < 2) continue;
        const members = indexes.map(i => institutions[i]);
        const addressKeys = members.map(roadAddressKey);
        const sharedBuilding = addressKeys.every(Boolean) && new Set(addressKeys).size === 1;
        const suspicious = !sharedBuilding;
        duplicates.push({ coordinate, count: indexes.length, classification: suspicious ? 'unconfirmed_duplicate' : 'shared_building',
            members: members.map(x => ({ id: x.id, source: x.source, sggCode: x.sggCode, name: x.name, address: x.address })) });
        if (suspicious) indexes.forEach(i => assessments[i].reasons.push('duplicate_coordinate_unconfirmed'));
    }
    const result = institutions.map((inst, i) => {
        const { input, lat, lng, reasons } = assessments[i];
        const record = { ...inst, latitude: reasons.length ? null : lat, longitude: reasons.length ? null : lng,
            locationStatus: reasons.length ? 'unconfirmed' : 'region_consistent' };
        delete record.locationIssues;
        delete record.sourceCoordinates;
        if (reasons.length) {
            record.locationIssues = reasons;
            record.sourceCoordinates = input;
        }
        return record;
    });
    return { institutions: result, duplicates };
}

module.exports = { parseCoordinate, contains, addressMatches, roadAddressKey, validateInstitutions };
