import ast
import math
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("update-dmi-bulk.py")
SOURCE = MODULE_PATH.read_text("utf-8")
TREE = ast.parse(SOURCE, filename=str(MODULE_PATH))
FUNCTIONS = {
    node.name: node
    for node in TREE.body
    if isinstance(node, ast.FunctionDef)
    and node.name in {"prefer_current_hour_candidate", "invalidate_obsolete_current_semantics"}
}
NAMESPACE = {
    "Any": object,
    "math": math,
    "CURRENT_MAX_DISTANCE_KM": 5.0,
    "CURRENT_PREFERRED_DISTANCE_KM": 3.0,
    "CURRENT_VECTOR_SEMANTICS_VERSION": 3,
    "CURRENT_VECTOR_SELECTION": "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer",
    "COLLECTION_ORDER": ["dkss_idw", "dkss_nsbs", "dkss_lf"],
    "epoch": lambda value: datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp() if value else 0.0,
}
exec(compile(ast.Module(body=list(FUNCTIONS.values()), type_ignores=[]), str(MODULE_PATH), "exec"), NAMESPACE)
PREFER = NAMESPACE["prefer_current_hour_candidate"]
INVALIDATE = NAMESPACE["invalidate_obsolete_current_semantics"]


def choice(distance, latitude, longitude, layer=17.0):
    return {
        "distanceKm": distance,
        "pointKey": (latitude, longitude),
        "layerRank": layer,
    }


valid = "2026-08-16T15:00:00Z"
point = {
    # Production evidence from Havknude: the scalar IDW model was selected at
    # 5.131 km, while exact NSBS current existed at 2.80363 km.
    "marineSelection": {
        "collection": "dkss_idw", "score": 5.131,
        "distanceKm": 5.131, "coastType": "east", "modelPenaltyKm": 0,
    },
    "hourly": {valid: {
        "sea-mean-deviation": 0.2,
        "sources": {"waterLevel": {"provider": "dmi", "collection": "dkss_idw"}},
    }},
    "gridPoints": {},
    "collections": {},
}

nsbs = choice(2.80363, 56.275, 10.8751453)
assert PREFER(point, valid, "dkss_nsbs", "2026-08-15T18:00:00Z", nsbs) is True
assert point["marineSelection"]["collection"] == "dkss_idw"

# Simulate the normal write after acceptance, then verify that a farther IDW
# U/V column cannot win merely because IDW is the scalar east-coast model.
point["hourly"][valid].update({
    "current-u": 0.1,
    "current-v": -0.2,
    "sources": {
        **point["hourly"][valid]["sources"],
        "current": {
            "provider": "dmi", "collection": "dkss_nsbs",
            "modelRun": "2026-08-15T18:00:00Z", "nativeValidTime": valid,
            "gridPoint": [10.8751453, 56.275], "distanceKm": 2.80363,
            "verticalLayer": "depthbelowsea:17", "verticalLayerRankM": 17.0,
        },
    },
})
idw_farther = choice(4.9, 56.28, 10.91)
assert PREFER(point, valid, "dkss_idw", "2026-08-15T18:00:00Z", idw_farther) is False
assert point["hourly"][valid]["sources"]["current"]["collection"] == "dkss_nsbs"

# Semantics-v2 current is invalidated, while unrelated scalar marine selection
# survives and can keep serving water level/temperature.
legacy = {
    "currentVectorSemanticsVersion": 2,
    "zones": {"PART::havknude": point},
}
removed = INVALIDATE(legacy)
assert removed == 1
assert "current-u" not in point["hourly"][valid]
assert "current" not in point["hourly"][valid]["sources"]
assert point["marineSelection"]["collection"] == "dkss_idw"
assert legacy["currentVectorSemanticsVersion"] == 3

assert "prefer_current_hour_candidate(" in SOURCE
assert "accept_marine_collection(\n                                point,\n                                zone,\n                                collection,\n                                distance" not in SOURCE

print("OK: Havknude regression proves cross-collection nearest current and semantics-v3 cache isolation.")
