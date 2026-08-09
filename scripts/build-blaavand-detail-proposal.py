#!/usr/bin/env python3
"""Build the private, score-neutral Blåvand detail proposal.

The physical GeoDanmark coast remains the source geometry. Each fragment is
offset a documented 15 metres towards the land side identified by the
centrally hydrated, verified admin anchor for that local coast part. The
opposite normal supplies a private water-point candidate. Nothing is activated.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, Point, mapping, shape
from shapely.ops import nearest_points, substring, transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
TO_METRES = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
TO_WGS84 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def project(geometry):
    return transform(TO_METRES.transform, geometry)


def unproject(geometry):
    return transform(TO_WGS84.transform, geometry)


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString([(point[0], point[1]) for point in geometry.coords])]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in line_parts(child)]
    return []


def source_ref(feature):
    props = feature.get("properties") or {}
    return str(props.get("id_lokalId") or props.get("objectid") or "unknown")


def anchor_point(anchor, field):
    value = anchor.get(field)
    if not isinstance(value, list) or len(value) < 2:
        raise SystemExit(f"Verificeret Blåvand-anker mangler {field}.")
    return Point(*TO_METRES.transform(value[0], value[1]))


def choose_landward_offset(line, distance, land_witness, water_witness):
    candidates = []
    for side in (distance, -distance):
        candidate = line.offset_curve(side, join_style=2)
        for part in line_parts(candidate):
            if part.length < 1:
                continue
            midpoint = part.interpolate(0.5, normalized=True)
            score = midpoint.distance(land_witness) - midpoint.distance(water_witness)
            candidates.append((score, part, side))
    if not candidates:
        raise SystemExit("Blåvand-fragment kunne ikke forskydes.")
    _, chosen, side = min(candidates, key=lambda item: item[0])
    return chosen, side


def local_point_pair(line, landward_side, land_offset, water_offset):
    midpoint_distance = line.length * 0.5
    half_window = min(20.0, line.length * 0.2)
    before = line.interpolate(max(0, midpoint_distance - half_window))
    after = line.interpolate(min(line.length, midpoint_distance + half_window))
    dx, dy = after.x - before.x, after.y - before.y
    length = max((dx * dx + dy * dy) ** 0.5, 0.001)
    left_x, left_y = -dy / length, dx / length
    sign = 1 if landward_side > 0 else -1
    midpoint = line.interpolate(midpoint_distance)
    land = Point(midpoint.x + sign * left_x * land_offset, midpoint.y + sign * left_y * land_offset)
    water = Point(midpoint.x - sign * left_x * water_offset, midpoint.y - sign * left_y * water_offset)
    onshore = (90 - __import__("math").degrees(__import__("math").atan2(land.y - water.y, land.x - water.x))) % 360
    return land, water, round(onshore, 1)


def split_fragments_at_headland(fragments, headland, radius):
    result = []
    split_count = 0
    for fragment in fragments:
        projected_distance = fragment.project(headland)
        if fragment.distance(headland) <= radius and 25 < projected_distance < fragment.length - 25:
            before = substring(fragment, 0, projected_distance)
            after = substring(fragment, projected_distance, fragment.length)
            result.extend(part for part in (before, after) if part.length >= 25)
            split_count += 1
        else:
            result.append(fragment)
    if split_count != 1:
        raise SystemExit(f"Blåvands fysiske kyst skulle have præcis ét huk-split, fandt {split_count}.")
    return result


def remove_headland_hairpin(line, headland, land_witnesses, water_witnesses, policy):
    """Replace one measured inward hairpin while retaining its seaward apex."""
    search_radius = policy["headlandHairpinSearchRadiusM"]
    step = 10.0
    start = max(0.0, line.project(headland) - search_radius * 2)
    end = min(line.length, line.project(headland) + search_radius * 2)
    samples = [(distance, line.interpolate(distance)) for distance in [start + index * step for index in range(int((end - start) / step) + 1)]]
    candidates = []
    for index, (first_distance, first) in enumerate(samples):
        if first.distance(headland) > search_radius:
            continue
        for second_distance, second in samples[index + 1:]:
            route = second_distance - first_distance
            if route < policy["headlandHairpinMinRouteM"] or second.distance(headland) > search_radius:
                continue
            chord = first.distance(second)
            if chord > policy["headlandHairpinMaxChordM"] or chord < 1:
                continue
            ratio = route / chord
            if ratio < policy["headlandHairpinMinRatio"]:
                continue
            candidates.append((route - chord, first_distance, second_distance, route, chord, ratio))
    if not candidates:
        raise SystemExit("Blåvands ortofoto-no-go kunne ikke genfinde den målte huk-hårnål.")
    _, first_distance, second_distance, route, chord, ratio = max(candidates)
    hairpin = substring(line, first_distance, second_distance)
    apex_distance, apex = min(
        ((first_distance + hairpin.project(Point(coordinate)), Point(coordinate)) for coordinate in hairpin.coords),
        key=lambda item: sum(item[1].distance(water) for water in water_witnesses) / len(water_witnesses)
        - sum(item[1].distance(land) for land in land_witnesses) / len(land_witnesses),
    )
    rejoin_candidates = []
    rejoin_end = min(line.length, second_distance + search_radius)
    distance = max(second_distance, apex_distance + policy["headlandHairpinMinRouteM"])
    while distance <= rejoin_end:
        point = line.interpolate(distance)
        route_from_apex = distance - apex_distance
        chord_from_apex = apex.distance(point)
        if 1 < chord_from_apex <= search_radius and route_from_apex / chord_from_apex >= 2.0:
            rejoin_candidates.append((route_from_apex - chord_from_apex, distance, route_from_apex, chord_from_apex))
        distance += step
    if not rejoin_candidates:
        raise SystemExit("Blåvands huk-hårnål havde intet sikkert genforeningspunkt efter det søværts apex.")
    _, rejoin_distance, cleaned_route, cleaned_chord = max(rejoin_candidates)
    prefix = list(substring(line, 0, apex_distance).coords)
    suffix = list(substring(line, rejoin_distance, line.length).coords)
    coordinates = prefix + [apex.coords[0]] + suffix
    cleaned = LineString(coordinates)
    return cleaned, {
        "routeLengthM": round(route, 1),
        "chordLengthM": round(chord, 1),
        "routeChordRatio": round(ratio, 2),
        "removedDetourM": round(line.length - cleaned.length, 1),
        "apexDistanceToOfficialHeadlandM": round(apex.distance(headland), 1),
        "apexToRejoinRouteM": round(cleaned_route, 1),
        "apexToRejoinChordM": round(cleaned_chord, 1),
    }


def build(work_dir, policy):
    zone_id = policy["zoneId"]
    reviews = load_json(ROOT / "data" / "geometry-v2" / "pilot-geographic-review.json")
    review = reviews["zones"].get(zone_id) or {}
    if review.get("nextStageAllowed") != "detailed-coast-refinement-only":
        raise SystemExit("Blåvand er ikke frigivet af den geografiske reviewgate.")

    zones = load_json(work_dir / "effective-pilot-zones.geojson")
    zone = next((row for row in zones.get("features") or [] if row.get("properties", {}).get("id") == zone_id), None)
    if not zone:
        raise SystemExit("Den centralt hydrerede Blåvand-zone mangler.")
    props = zone.get("properties") or {}
    anchors = {row.get("id"): row for row in props.get("directionAnchors") or [] if row.get("verified") is True}
    if len(anchors) < 2:
        raise SystemExit("Blåvand kræver to centralt verificerede land-/vandankre.")

    names = load_json(work_dir / "pilot-name-and-migration-audit.json")
    name_row = next(row for row in names.get("zones") or [] if row.get("zoneId") == zone_id)
    headland = next((row for row in name_row.get("officialPlaceCandidates") or [] if row.get("primaryName") == policy["officialHeadlandName"]), None)
    if not headland or not headland.get("visualCentre"):
        raise SystemExit("Det officielle Blåvands Huk-splitpunkt mangler.")
    headland_point = Point(*TO_METRES.transform(*headland["visualCentre"][:2]))

    proposals = load_json(work_dir / "coastal-part-proposals.geojson")
    source_features = [
        row for row in proposals.get("features") or []
        if row.get("properties", {}).get("zoneId") == zone_id
        and row.get("properties", {}).get("kind") == "private-coastal-part-proposal"
    ]
    source_fragments = [part for row in source_features for part in line_parts(project(shape(row["geometry"]))) if part.length >= 25]
    if not source_fragments:
        raise SystemExit("Blåvands kontrollerede kystdelsforslag mangler.")
    land_witnesses = [anchor_point(anchor, "pinPoint") for anchor in anchors.values()]
    water_witnesses = [anchor_point(anchor, "dataPoint") for anchor in anchors.values()]
    headland_fragment = min(source_fragments, key=lambda fragment: fragment.distance(headland_point))
    cleaned_headland, hairpin_control = remove_headland_hairpin(headland_fragment, headland_point, land_witnesses, water_witnesses, policy)
    source_fragments = [cleaned_headland if fragment is headland_fragment else fragment for fragment in source_fragments]
    source_fragments = split_fragments_at_headland(source_fragments, headland_point, policy["headlandSplitRadiusM"])

    part_states = []
    output_features = []
    for part_policy in policy["parts"]:
        anchor = anchors.get(part_policy["anchorId"])
        if not anchor:
            raise SystemExit(f"Blåvand-anker mangler: {part_policy['anchorId']}")
        land_witness = anchor_point(anchor, "pinPoint")
        water_witness = anchor_point(anchor, "dataPoint")
        part_states.append({**part_policy, "anchor": anchor, "landWitness": land_witness, "waterWitness": water_witness, "source": [], "offset": []})

    for fragment in source_fragments:
        representative = fragment.interpolate(0.5, normalized=True)
        state = min(part_states, key=lambda row: representative.distance(row["landWitness"]))
        offset, side = choose_landward_offset(fragment, policy["landwardOffsetM"], state["landWitness"], state["waterWitness"])
        state["source"].append(fragment)
        state["offset"].append((offset, side, fragment))

    detail_rows = []
    for state in part_states:
        if not state["offset"]:
            raise SystemExit(f"Ingen fysiske kystfragmenter for {state['partId']}.")
        split_distance = unary_union(state["source"]).distance(headland_point)
        if split_distance > policy["headlandSplitRadiusM"]:
            raise SystemExit(f"{state['partId']} når ikke det officielle Blåvands Huk-splitområde ({split_distance:.1f} m).")
        longest_offset, longest_side, longest_source = max(state["offset"], key=lambda item: item[0].length)
        land_point, water_point, onshore = local_point_pair(
            longest_source,
            longest_side,
            policy["landPointOffsetM"],
            policy["waterPointOffsetM"],
        )
        source_union = unary_union(state["source"])
        detail_geometry = MultiLineString([list(item[0].coords) for item in state["offset"]])
        offset_distances = [item[0].distance(item[2]) for item in state["offset"]]
        land_side_verified = land_point.distance(state["landWitness"]) < water_point.distance(state["landWitness"])
        water_side_verified = water_point.distance(state["waterWitness"]) < land_point.distance(state["waterWitness"])
        if not land_side_verified or not water_side_verified:
            raise SystemExit(f"Land-/vandsiden kunne ikke verificeres for {state['partId']}.")
        row = {
            "partId": state["partId"],
            "name": state["name"],
            "anchorId": state["anchor"]["id"],
            "sourceFragmentCount": len(state["source"]),
            "sourceLengthM": round(source_union.length, 1),
            "detailLengthM": round(detail_geometry.length, 1),
            "landwardOffsetM": policy["landwardOffsetM"],
            "measuredOffsetRangeM": [round(min(offset_distances), 2), round(max(offset_distances), 2)],
            "landPoint": list(unproject(land_point).coords)[0][:2],
            "waterPoint": list(unproject(water_point).coords)[0][:2],
            "onshoreDirectionDeg": onshore,
            "landSideControl": "verified-against-central-admin-land-witness",
            "waterSideControl": "verified-against-central-admin-water-witness",
            "dmiGridValidationStatus": "not-run-no-independent-weather-sampling",
            "weatherSamplingEnabled": False,
            "automaticActivationAllowed": False,
            "scoreChanged": False,
        }
        detail_rows.append(row)
        output_features.extend([
            {"type": "Feature", "properties": {"zoneId": zone_id, "partId": row["partId"], "name": row["name"], "kind": "private-landward-detail-line", "automaticActivationAllowed": False}, "geometry": mapping(unproject(detail_geometry))},
            {"type": "Feature", "properties": {"zoneId": zone_id, "partId": row["partId"], "name": row["name"], "kind": "private-land-point-candidate", "automaticActivationAllowed": False}, "geometry": mapping(unproject(land_point))},
            {"type": "Feature", "properties": {"zoneId": zone_id, "partId": row["partId"], "name": row["name"], "kind": "private-water-point-candidate", "automaticActivationAllowed": False}, "geometry": mapping(unproject(water_point))},
        ])

    all_source = unary_union(source_fragments)
    morphology = []
    hoefde_path = work_dir / "pilot-west-vadehavet" / "Hoefde.geojson"
    for feature in load_json(hoefde_path).get("features") or []:
        geometry = project(shape(feature["geometry"]))
        if geometry.distance(all_source) > policy["morphologySearchM"]:
            continue
        coast_point, feature_point = nearest_points(all_source, geometry)
        item = {
            "featureId": source_ref(feature),
            "distanceToPhysicalCoastM": round(coast_point.distance(feature_point), 1),
            "status": "score-neutral-morphology-hypothesis",
            "automaticActivationAllowed": False,
            "scoreChanged": False,
        }
        morphology.append(item)
        output_features.append({"type": "Feature", "properties": {"zoneId": zone_id, "kind": "private-groyne-hypothesis", **item}, "geometry": mapping(unproject(feature_point))})

    source_hash = hashlib.sha256((work_dir / "coastal-part-proposals.geojson").read_bytes()).hexdigest()
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-read-only-blaavand-detail-proposal",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "zoneId": zone_id,
        "currentName": props.get("name"),
        "officialSplitReference": {"name": headland["primaryName"], "visualCentre": headland["visualCentre"]},
        "sourceProposalSha256": source_hash,
        "coastalPartCount": len(detail_rows),
        "morphologyHypothesisCount": len(morphology),
        "coastalParts": detail_rows,
        "morphologyHypotheses": morphology,
        "headlandSplitRadiusM": policy["headlandSplitRadiusM"],
        "headlandHairpinControl": hairpin_control,
        "productionGeometryChanged": False,
        "adminDataChanged": False,
        "weatherSamplingChanged": False,
        "scoreChanged": False,
        "automaticActivationAllowed": False,
        "remainingReview": [
            "Visuel kontrol af begge landforskudte linjer mod ortofoto eller tilsvarende kontrolkilde.",
            "Fysisk DMI-gridkontrol kræves før vandpunkterne kan blive selvstændige vejrpunkter.",
            "Administrator-roundtrip og systemisk migration er ikke godkendt i denne private fase."
        ],
    }
    return report, {"type": "FeatureCollection", "features": output_features}


def self_test():
    global TO_METRES, TO_WGS84
    original_metres, original_wgs84 = TO_METRES, TO_WGS84
    TO_METRES = Transformer.from_crs("EPSG:25832", "EPSG:25832", always_xy=True)
    TO_WGS84 = TO_METRES
    try:
        source = LineString([(0, 0), (100, 0)])
        land, water = Point(50, 100), Point(50, -100)
        offset, side = choose_landward_offset(source, 15, land, water)
        assert side > 0 and round(offset.distance(source)) == 15
        land_point, water_point, _ = local_point_pair(source, side, 60, 250)
        assert land_point.y > 0 and water_point.y < 0
        split = split_fragments_at_headland([LineString([(0, 0), (100, 0), (100, 100)])], Point(100, 0), 1)
        assert len(split) == 2 and round(sum(part.length for part in split)) == 200
        hairpin_policy = {
            "headlandHairpinSearchRadiusM": 300,
            "headlandHairpinMinRouteM": 200,
            "headlandHairpinMaxChordM": 150,
            "headlandHairpinMinRatio": 2.5,
        }
        hairpin = LineString([(-300, 0), (-50, 0), (0, -100), (50, 0), (0, 40), (60, 0), (300, 0)])
        cleaned, control = remove_headland_hairpin(hairpin, Point(0, 0), [Point(0, 200)], [Point(0, -300)], hairpin_policy)
        assert cleaned.length < hairpin.length and control["routeChordRatio"] >= 2.5
    finally:
        TO_METRES, TO_WGS84 = original_metres, original_wgs84
    policy = load_json(ROOT / "data" / "geometry-v2" / "blaavand-detail-policy.json")
    assert policy["zoneId"] == "DK-B03-13" and len(policy["parts"]) == 2
    assert policy["automaticActivationAllowed"] is False and policy["scoreChanged"] is False
    print("Blåvand detailproposal self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--policy", type=Path, default=ROOT / "data" / "geometry-v2" / "blaavand-detail-policy.json")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--allow-external-private-work-dir", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    work_dir = args.work_dir.resolve()
    if ROOT not in work_dir.parents and not args.allow_external_private_work_dir:
        raise SystemExit("Detaljepilotens arbejdsmappe skal ligge i workspace.")
    required = ("effective-pilot-zones.geojson", "coastal-part-proposals.geojson", "pilot-name-and-migration-audit.json")
    if any(not (work_dir / name).exists() for name in required):
        raise SystemExit("Blåvand-detailforslaget mangler centralt hydreret pilotinput.")
    report, geojson = build(work_dir, load_json(args.policy.resolve()))
    (work_dir / "blaavand-detail-proposal.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (work_dir / "blaavand-detail-proposal.geojson").write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Privat Blåvand-detailforslag: {report['coastalPartCount']} kystdele / {report['morphologyHypothesisCount']} score-neutrale høfter.")


if __name__ == "__main__":
    main()
