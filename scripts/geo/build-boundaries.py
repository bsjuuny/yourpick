"""Rebuild offline municipality checks: python (shapely required) build-boundaries.py source.geojson.
Source and licensing: scripts/geo/README.md. No facility coordinate is generated here.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

root = Path(__file__).resolve().parents[2]
source = json.load(open(sys.argv[1]))
groups = defaultdict(list)
for feature in source['features']:
    p = feature['properties']
    groups[p['sgg']].append(feature)
# Keep all source municipalities, plus aggregate cities used by the collector.
regions = json.load(open(root / 'public/data/regions.json'))
region_names = {r['sggCode']: s['sidoName'] + ' ' + r['sggName'] for s in regions for r in s['sggList']}
for province in regions:
    for region in province['sggList']:
        code = region['sggCode']
        if code not in groups:
            groups[code] = [f for f in source['features'] if
                           f['properties']['sido'] == province['sidoCode'] and
                           f['properties']['sggnm'].replace(' ', '').startswith(region['sggName'])]
result = {}
for code, features in sorted(groups.items()):
    if not features:
        raise ValueError(f'No geometry for {code}')
    # ~10 metres, topology preserved. This is a regional plausibility check,
    # never proof of a building location. Border points are kept unconfirmed.
    geometry = unary_union([shape(f['geometry']) for f in features]).simplify(0.0001, preserve_topology=True)
    result[code] = {'name': region_names.get(code, features[0]['properties']['sidonm'] + ' ' + features[0]['properties']['sggnm']),
                    'bbox': list(geometry.bounds), 'geometry': mapping(geometry)}
with open(root / 'scripts/geo/municipalities.json', 'w') as out:
    json.dump(result, out, ensure_ascii=False, separators=(',', ':'))
    out.write('\n')
print(f'{len(result)} municipality geometries')
