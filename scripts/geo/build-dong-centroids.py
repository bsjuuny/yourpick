"""Build approximate locations for administrative dongs: python build-dong-centroids.py source.geojson

Lets a parent choose "my neighbourhood" instead of typing an exact address.
Each dong gets a point guaranteed to lie inside it (shapely representative_point),
rounded to 4 decimals (~10 m). This is a neighbourhood reference point, not an
address, and must never be shown as a commute time.

Source and licensing are the same as municipalities.json (scripts/geo/README.md).
Output: public/data/dongs.json  {"<collector sggCode>": [["미성동", lat, lng], ...]}
"""
import json
import sys
from pathlib import Path
from shapely.geometry import shape

root = Path(__file__).resolve().parents[2]
source = json.load(open(sys.argv[1], encoding='utf-8'))
regions = json.load(open(root / 'public/data/regions.json', encoding='utf-8'))

by_sgg = {}
for feature in source['features']:
    by_sgg.setdefault(feature['properties']['sgg'], []).append(feature)

result = {}
for province in regions:
    for region in province['sggList']:
        code = region['sggCode']
        features = by_sgg.get(code)
        if not features:
            # Aggregate cities in the collector (e.g. 수원시 41110 = its four districts).
            features = [f for f in source['features'] if
                        f['properties']['sido'] == province['sidoCode'] and
                        f['properties']['sggnm'].replace(' ', '').startswith(region['sggName'])]
        if not features:
            raise ValueError(f'No dong geometry for {code} {region["sggName"]}')
        dongs = []
        for f in features:
            name = f['properties']['adm_nm'].split(' ')[-1]
            point = shape(f['geometry']).representative_point()
            dongs.append([name, round(point.y, 4), round(point.x, 4)])
        # Same dong name can exist in two districts of an aggregate city (e.g. 수원시): keep both, label by district.
        names = [d[0] for d in dongs]
        for d, f in zip(dongs, features):
            if names.count(d[0]) > 1:
                d[0] = f"{d[0]} ({f['properties']['sggnm'].split(' ')[-1]})"
        result[code] = sorted(dongs, key=lambda d: d[0])

out = root / 'public/data/dongs.json'
with open(out, 'w', encoding='utf-8', newline='\n') as handle:
    json.dump(result, handle, ensure_ascii=False, separators=(',', ':'))
    handle.write('\n')
print(f'{sum(len(v) for v in result.values())} dongs in {len(result)} regions -> {out}')
