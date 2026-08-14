#!/usr/bin/env python3
"""Build a private owner review for the legacy fallback zones.

The output never changes production geometry. It overlays the legacy guide,
the complete official GeoDanmark coastline inside a deliberately bounded
geographic window, and already active precise parts from neighbouring zones.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, box, mapping, shape
from shapely.ops import linemerge, transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
WINDOWS = {
    "DK-B07-19": (10.62, 54.70, 10.77, 54.85),
    "DK-B08-12": (11.67, 55.89, 11.84, 56.00),
    "DK-B08-18": (12.36, 56.06, 12.58, 56.15),
    "DK-B08-19": (12.53, 55.97, 12.66, 56.10),
    "DK-B10-14": (10.86, 54.56, 11.16, 54.82),
}
SELECTIONS = {
    "DK-B07-19": box(10.64, 54.70, 10.76, 54.79),
    "DK-B08-12": box(11.68, 55.94, 11.82, 56.00),
    "DK-B08-18": box(12.36, 56.075, 12.53, 56.15),
    "DK-B08-19": box(12.53, 56.035, 12.63, 56.09),
    "DK-B10-14": unary_union([box(10.86, 54.56, 11.16, 54.72), box(10.86, 54.68, 11.01, 54.82)]),
}
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
FROM_M = Transformer.from_crs(25832, 4326, always_xy=True).transform
NEW_GEOMETRY_ZONES = set(WINDOWS)
OWNERSHIP_MOVES = {
    "DK-B07-20": ["dk-b10-14-national-part-01-locality-01", "dk-b10-14-national-part-01-locality-02"],
}
NEIGHBOUR_SPLITS = {
    "DK-B08-12": ["dk-b08-10-national-part-01", "dk-b08-10-national-part-02", "dk-b08-10-national-part-03"],
    "DK-B08-18": ["dk-b08-17-national-part-01", "dk-b08-17-national-part-02"],
    "DK-B08-19": ["dk-b09-01-national-part-01", "dk-b09-01-national-part-05"],
}
REPLACED_PARTS = [
    "dk-b10-14-national-part-02-locality-01", "dk-b10-14-national-part-02-locality-02",
    *[part_id for part_ids in NEIGHBOUR_SPLITS.values() for part_id in part_ids],
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in line_parts(child)]
    return []


def build(zones, official, active_parts):
    by_id = {feature["properties"]["id"]: feature for feature in zones.get("features", [])}
    official_lines = [shape(feature["geometry"]) for feature in official.get("features", [])]
    reviews = []
    for zone_id, bounds in WINDOWS.items():
        zone = by_id[zone_id]
        clip = box(*bounds)
        candidates = []
        for geometry in official_lines:
            if not geometry.intersects(clip):
                continue
            candidates.extend(line_parts(geometry.intersection(clip)))
        suggested = []
        selection = SELECTIONS[zone_id]
        for geometry in candidates:
            if geometry.intersects(selection):
                suggested.extend(line_parts(geometry.intersection(selection)))
        if suggested:
            suggested = line_parts(linemerge(unary_union(suggested)))
            suggested = [line for line in suggested if transform(TO_M, line).length >= 250]
        neighbours = []
        for owner_id, parts in (active_parts.get("zones") or {}).items():
            for part in parts:
                geometry = shape(part["geometry"])
                if geometry.intersects(clip):
                    neighbours.append({"zoneId": owner_id, "partId": part["partId"], "name": part.get("name"), "geometry": part["geometry"]})
        reviews.append({
            "zoneId": zone_id,
            "name": zone["properties"]["name"],
            "window": bounds,
            "legacy": mapping(LineString(zone["properties"]["coastLine"])),
            "official": [mapping(line) for line in candidates if line.length > 0.00005],
            "suggested": [mapping(line) for line in suggested if line.length > 0.00005],
            "neighbours": neighbours,
        })
    return reviews


def candidate_geojson(reviews, active_parts):
    """Materialise the reviewed geometry as a private, score-neutral candidate.

    These features intentionally have no sampling points yet. A candidate cannot
    be activated until the point/DMI pipeline has produced and validated them.
    """
    features = []
    for review in reviews:
        if review["zoneId"] not in NEW_GEOMETRY_ZONES:
            continue
        for index, geometry in enumerate(review["suggested"], start=1):
            features.append({
                "type": "Feature",
                "properties": {
                    "zoneId": review["zoneId"],
                    "zoneName": review["name"],
                    "partId": f'{review["zoneId"].lower()}-fallback-recovery-{index:02d}',
                    "source": "GeoDanmark-Kyst",
                    "status": "private-candidate-awaiting-point-and-dmi-validation",
                    "automaticActivationAllowed": False,
                },
                "geometry": geometry,
            })
    active_index = {
        part["partId"]: (owner, part)
        for owner, parts in (active_parts.get("zones") or {}).items()
        for part in parts
    }
    active_rows = [
        (owner, part)
        for owner, parts in (active_parts.get("zones") or {}).items()
        for part in parts
    ]
    target = unary_union([transform(TO_M, shape(feature["geometry"])) for feature in features])
    for target_zone, part_ids in NEIGHBOUR_SPLITS.items():
        for part_id in part_ids:
            active = active_index.get(part_id)
            if active is None:
                existing_remainders = [
                    (owner, part)
                    for owner, part in active_rows
                    if str(part.get("partId") or "").startswith(f"{part_id}-remainder-")
                ]
                for owner, part in existing_remainders:
                    features.append({
                        "type": "Feature",
                        "properties": {
                            "zoneId": owner,
                            "zoneName": part.get("name") or owner,
                            "partId": part["partId"],
                            "source": "already-active-validated-neighbour-remainder",
                            "replacesPartId": part_id,
                            "status": "private-candidate-awaiting-point-and-dmi-validation",
                            "automaticActivationAllowed": False,
                            "landPoint": part.get("landPoint"),
                            "waterPoint": part.get("waterPoint"),
                            "onshoreDirectionDeg": part.get("onshoreDirectionDeg"),
                        },
                        "geometry": part["geometry"],
                    })
                continue
            owner, part = active
            remainder = transform(TO_M, shape(part["geometry"])).difference(target.buffer(2))
            for index, line in enumerate(line_parts(remainder), start=1):
                if line.length < 250:
                    continue
                replacement_id = f"{part_id}-remainder-{index:02d}"
                features.append({
                    "type":"Feature",
                    "properties":{
                        "zoneId":owner,"zoneName":part.get("name") or owner,
                        "partId":replacement_id,"source":"validated-neighbour-remainder",
                        "replacesPartId":part_id,"status":"private-candidate-awaiting-point-and-dmi-validation",
                        "automaticActivationAllowed":False,
                    },
                    "geometry":mapping(transform(FROM_M, line)),
                })
    return {"type": "FeatureCollection", "features": features}


def candidate_bundle(candidate):
    zones = {}
    for feature in candidate["features"]:
        props = feature["properties"]
        row = {
            "partId": props["partId"],
            "sourceZoneId": props["zoneId"],
            "name": props["zoneName"],
            "geometry": feature["geometry"],
            "marineCoverage": "pending-private-dmi-validation",
            "coverageGaps": [],
        }
        if props.get("landPoint") and props.get("waterPoint"):
            row["landPoint"] = props["landPoint"]
            row["waterPoint"] = props["waterPoint"]
            row["onshoreDirectionDeg"] = props.get("onshoreDirectionDeg")
        zones.setdefault(props["zoneId"], []).append(row)
    return {
        "schemaVersion": "2.0.0-private",
        "status": "private-fallback-zone-recovery-awaiting-point-and-dmi-validation",
        "automaticActivationAllowed": False,
        "zones": zones,
    }


def audit_report(reviews, candidate):
    return {
        "schemaVersion": "1.0.0",
        "status": "private-fallback-zone-recovery-candidate",
        "productionChanged": False,
        "automaticActivationAllowed": False,
        "deletedZonesPreserved": ["DK-B02-14", "DK-B10-16"],
        "ownershipMoves": OWNERSHIP_MOVES,
        "replacedPartsToDisableAfterDmiApproval": REPLACED_PARTS,
        "requiredBeforeActivation": [
            "owner geometry review",
            "unique main-zone ownership and zero cross-zone overlap",
            "validated land/water points",
            "validated DMI grid and multi-step weather series",
            "score-neutral shadow comparison",
            "public runtime and rollback gates",
        ],
        "zones": [{
            "zoneId": review["zoneId"],
            "zoneName": review["name"],
            "candidatePartCount": len(review["suggested"]),
            "legacyGeometryRejected": review["zoneId"] in {"DK-B08-18", "DK-B08-19", "DK-B10-14"},
        } for review in reviews],
        "candidateFeatureCount": len(candidate["features"]),
    }


def html(reviews):
    payload = json.dumps(reviews, ensure_ascii=False, separators=(",", ":"))
    return f"""<!doctype html><html lang=\"da\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>RavRadar · fallbackzoner</title><link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\"><style>body{{margin:0;font:16px system-ui;background:#eef3f5;color:#14242d}}header{{padding:18px 24px;background:#102936;color:white}}main{{display:grid;grid-template-columns:360px 1fr;height:calc(100vh - 93px)}}aside{{padding:16px;overflow:auto}}button{{display:block;width:100%;text-align:left;margin:8px 0;padding:12px;border:1px solid #9aacb4;border-radius:10px;background:white;font-weight:700}}button.active{{background:#0879a7;color:white}}#map{{height:100%}}.legend{{background:white;padding:10px;line-height:1.7}}.sw{{display:inline-block;width:28px;border-top:6px solid;margin-right:8px}}.official{{border-color:#0879a7}}.suggested{{border-color:#12a05c}}.legacy{{border-color:#e43f5a;border-top-style:dashed}}.active{{border-color:#f28c28}}.notice{{padding:12px;border-left:5px solid #d89b20;background:#fff7d8}}small{{display:block;font-weight:400;margin-top:4px}}</style></head><body><header><h1>Privat kontrol af fallbackzoner</h1><div>Grøn er RavRadars forslag. Blå er øvrig officiel kyst. Rød stiplet er den gamle linje. Orange er allerede aktive kystdele.</div></header><main><aside><div class=\"notice\"><b>Havnø/Mariager Fjord øst og Fejø/Femø er bevidst slettet.</b> De indgår ikke som kandidater.</div><div id=\"list\"></div></aside><div id=\"map\"></div></main><script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script><script>const reviews={payload};const map=L.map('map');L.tileLayer('https://tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png',{{maxZoom:19,attribution:'© OpenStreetMap'}}).addTo(map);let layers=[];const ll=g=>g.type==='LineString'?g.coordinates.map(p=>[p[1],p[0]]):g.coordinates.flatMap(line=>line.map(p=>[p[1],p[0]]));function show(r){{layers.forEach(x=>x.remove());layers=[];r.official.forEach(g=>layers.push(L.polyline(ll(g),{{color:'#0879a7',weight:5,opacity:.35}}).addTo(map)));r.neighbours.forEach(p=>layers.push(L.polyline(ll(p.geometry),{{color:'#f28c28',weight:5,opacity:.55}}).bindTooltip(`${{p.name||p.partId}} · ${{p.zoneId}}`).addTo(map)));r.suggested.forEach(g=>layers.push(L.polyline(ll(g),{{color:'#12a05c',weight:10,opacity:.95}}).bindTooltip('RavRadars forslag').addTo(map)));layers.push(L.polyline(ll(r.legacy),{{color:'#e43f5a',weight:4,dashArray:'8 8'}}).bindTooltip('Gammel fallbacklinje').addTo(map));const b=L.latLngBounds(layers.flatMap(x=>x.getLatLngs().flat(Infinity).filter(v=>v&&v.lat)));map.fitBounds(b.pad(.15));document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.id===r.zoneId));}}const list=document.querySelector('#list');reviews.forEach(r=>{{const b=document.createElement('button');b.dataset.id=r.zoneId;b.innerHTML=`${{r.name}}<small>${{r.zoneId}} · ${{r.suggested.length}} foreslåede officielle stykker</small>`;b.onclick=()=>show(r);list.appendChild(b)}});show(reviews[0]);const legend=L.control({{position:'bottomright'}});legend.onAdd=()=>{{const d=L.DomUtil.create('div','legend');d.innerHTML='<div><i class=\"sw suggested\"></i>RavRadars forslag</div><div><i class=\"sw official\"></i>Øvrig officiel kyst</div><div><i class=\"sw legacy\"></i>Gammel linje</div><div><i class=\"sw active\"></i>Aktive dele</div>';return d}};legend.addTo(map);</script></body></html>"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data/zones.geojson")
    parser.add_argument("--official", type=Path, default=ROOT / ".audit/run-31524509148-kyst/national-Kyst.geojson")
    parser.add_argument("--parts", type=Path, default=ROOT / "data/live/coastal-parts-v2.json")
    parser.add_argument("--output", type=Path, default=ROOT / "KYSTZONER-FALLBACK-KONTROL.html")
    parser.add_argument("--candidate", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-candidate.geojson")
    parser.add_argument("--bundle", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-candidate.json")
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-report.json")
    args = parser.parse_args()
    reviews = build(load(args.zones), load(args.official), load(args.parts))
    for path in (args.output, args.candidate, args.bundle, args.report):
        path.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html(reviews), encoding="utf-8")
    candidate = candidate_geojson(reviews, load(args.parts))
    args.candidate.write_text(json.dumps(candidate, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    args.bundle.write_text(json.dumps(candidate_bundle(candidate), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    args.report.write_text(json.dumps(audit_report(reviews, candidate), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"zoneCount": len(reviews), "candidateFeatureCount": len(candidate["features"]), "output": str(args.output), "candidate": str(args.candidate), "productionChanged": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
