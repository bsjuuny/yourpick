# Offline regional plausibility checks

`municipalities.json` derives from **Statistics Korea SGIS**, processed by
[vuski/admdongkor](https://github.com/vuski/admdongkor), snapshot **2025-04-01**.
Source: `ver20250401/HangJeongDong_ver20250401.geojson`, repository commit
`d5d5a821c8de6cc337d47eeca604d7af76271c9b`.

Boundary data attribution/license: Statistics Korea SGIS (공공누리 제1유형),
vuski/admdongkor, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The derived boundary dataset retains those attribution obligations.

The snapshot matches the municipality codes in the existing collected files.
It is **not** a current cadastral or address database. Changed/unknown codes fail
closed; update the boundary snapshot and collector region metadata together.
Do not silently alias a changed administrative code to a different region.

Rebuild (Python 3 and Shapely required):

```sh
curl -L --fail -o /tmp/yourpick-boundaries.geojson https://raw.githubusercontent.com/vuski/admdongkor/d5d5a821c8de6cc337d47eeca604d7af76271c9b/ver20250401/HangJeongDong_ver20250401.geojson
python scripts/geo/build-boundaries.py /tmp/yourpick-boundaries.geojson
```

The builder dissolves dong boundaries by municipality and creates aggregate city
geometries for the collector (e.g. 성남시 includes its three districts). It
simplifies at 0.0001 degrees (~10 m), preserving topology, islands and holes.
A point outside its expected polygon is withheld, including possible borderline
false positives. This test does **not** verify a building's exact location.
There is no centroid substitution, coordinate randomization, geocoding guess,
or automatic latitude/longitude swapping.

`region_consistent` means only that strict numeric/range, address-region and
municipality geometry checks passed, with no suspicious exact duplicate.
`unconfirmed` means coordinates exposed to consumers are both `null`; original
input values remain in `sourceCoordinates` and reasons in `locationIssues`.
The audit reuses that evidence on reruns and always reassesses it. A later clean
API response can replace an unconfirmed value.

Exact duplicate coordinates are grouped across every facility file and source.
A common municipality + road name + building number is treated as a shared
building (apartment/unit suffixes ignored). Conflicting or unparseable building
addresses are quarantined for review, not declared definitely incorrect.
