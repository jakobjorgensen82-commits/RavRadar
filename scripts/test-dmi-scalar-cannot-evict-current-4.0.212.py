import ast
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("update-dmi-bulk.py")
TREE = ast.parse(MODULE_PATH.read_text("utf-8"), filename=str(MODULE_PATH))
FUNCTIONS = {
    node.name: node
    for node in TREE.body
    if isinstance(node, ast.FunctionDef) and node.name in {"marine_model_score", "accept_marine_collection"}
}
NAMESPACE = {
    "Any": object,
    "MAX_GRID_DISTANCE_KM": {"limfjord": 24.0, "west": 40.0, "east": 32.0},
    "MARINE_MODEL_PENALTY_KM": {
        "limfjord": {"dkss_lf": 0.0, "dkss_idw": 8.0, "dkss_nsbs": 18.0},
        "west": {"dkss_nsbs": 0.0, "dkss_idw": 10.0, "dkss_lf": 22.0},
        "east": {"dkss_idw": 0.0, "dkss_lf": 10.0, "dkss_nsbs": 20.0},
    },
    "MARINE_PARAMETERS": {
        "sea-mean-deviation", "current-u", "current-v", "water-temperature",
        "wind-tail-u-10m", "wind-tail-v-10m",
    },
}
exec(
    compile(ast.Module(body=[FUNCTIONS["marine_model_score"], FUNCTIONS["accept_marine_collection"]], type_ignores=[]), str(MODULE_PATH), "exec"),
    NAMESPACE,
)
ACCEPT = NAMESPACE["accept_marine_collection"]


def selected_nsbs_point():
    return {
        "marineSelection": {
            "collection": "dkss_nsbs",
            "score": 10.999,
            "distanceKm": 10.999,
            "coastType": "west",
            "modelPenaltyKm": 0,
        },
        "hourly": {
            "2026-08-15T00:00:00Z": {
                "current-u": 0.1,
                "current-v": -0.2,
                "sea-mean-deviation": 0.03,
            }
        },
        "gridPoints": {"current-u": {"distanceKm": 10.999}, "current-v": {"distanceKm": 10.999}},
        "collections": {"current-u": "dkss_nsbs", "current-v": "dkss_nsbs"},
    }


zone = {"coastType": "west"}
point = selected_nsbs_point()

# Produktionsregressionen: en IDW-skalar på 0,375 km + 10 km straf ser marginalt
# bedre ud end NSBS-strømparret på 10,999 km. Den må ikke rydde strømserien.
assert ACCEPT(point, zone, "dkss_idw", 0.375, allow_existing_selection_update=False) is False
assert point["marineSelection"]["collection"] == "dkss_nsbs"
assert point["marineSelection"]["score"] == 10.999
assert point["hourly"]["2026-08-15T00:00:00Z"]["current-u"] == 0.1

# Et skalarfelt fra den valgte model må tilføjes uden at omskrive strømvalgets score.
assert ACCEPT(point, zone, "dkss_nsbs", 3.407, allow_existing_selection_update=False) is True
assert point["marineSelection"]["score"] == 10.999

# Et reelt bedre fælles strømpar må fortsat skifte den autoritative havmodel.
assert ACCEPT(point, zone, "dkss_idw", 0.2) is True
assert point["marineSelection"]["collection"] == "dkss_idw"
assert "current-u" not in point["hourly"]["2026-08-15T00:00:00Z"]

print("OK: skalare marinefelter kan ikke genvælge havmodel eller rydde en bevaret strømserie; et bedre strømpar kan fortsat skifte model.")
