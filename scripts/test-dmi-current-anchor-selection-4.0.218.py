import ast
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("update-dmi-bulk.py")
TREE = ast.parse(MODULE_PATH.read_text("utf-8"), filename=str(MODULE_PATH))
FUNCTIONS = {
    node.name: node
    for node in TREE.body
    if isinstance(node, ast.FunctionDef)
    and node.name in {"marine_model_score", "has_current_anchor", "accept_marine_collection"}
}
NAMESPACE = {
    "Any": object,
    "MAX_GRID_DISTANCE_KM": {"west": 40.0},
    "MARINE_MODEL_PENALTY_KM": {
        "west": {"dkss_nsbs": 0.0, "dkss_idw": 10.0},
        "east": {"dkss_nsbs": 20.0, "dkss_idw": 0.0},
    },
    "MARINE_PARAMETERS": {"sea-mean-deviation", "current-u", "current-v", "water-temperature"},
    "epoch": lambda value: datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp() if value else 0.0,
}
exec(compile(ast.Module(body=list(FUNCTIONS.values()), type_ignores=[]), str(MODULE_PATH), "exec"), NAMESPACE)
ACCEPT = NAMESPACE["accept_marine_collection"]


def selected_nsbs_point():
    return {
        "marineSelection": {"collection": "dkss_nsbs", "score": 10.999},
        "hourly": {
            "2026-08-15T12:00:00Z": {"current-u": 0.1, "current-v": -0.2},
            "2026-08-15T15:00:00Z": {"current-u": 0.2, "current-v": -0.1},
        },
        "gridPoints": {},
        "collections": {},
    }


zone = {"coastType": "west"}
reference = "2026-08-15T12:00:00Z"

# Produktionsregressionen: et marginalt bedre IDW-par fire døgn ude må ikke
# rydde den aktuelle NSBS-serie.
point = selected_nsbs_point()
assert ACCEPT(point, zone, "dkss_idw", 0.2, candidate_valid_time="2026-08-19T12:00:00Z", reference_time=reference) is False
assert point["marineSelection"]["collection"] == "dkss_nsbs"
assert point["hourly"]["2026-08-15T12:00:00Z"]["current-u"] == 0.1

# Samme geografisk bedre model må fortsat overtage, når den selv dokumenterer
# et fælles U/V-par omkring nu.
point = selected_nsbs_point()
assert ACCEPT(point, zone, "dkss_idw", 0.2, candidate_valid_time="2026-08-15T15:00:00Z", reference_time=reference) is True
assert point["marineSelection"]["collection"] == "dkss_idw"
assert "current-u" not in point["hourly"]["2026-08-15T12:00:00Z"]

# Mangler den eksisterende model selv et aktuelt anker, må en bedre kandidat
# stadig reparere zonen, også hvis dens første gyldige par ligger senere.
point = selected_nsbs_point()
point["hourly"] = {"2026-08-14T00:00:00Z": {"current-u": 0.1, "current-v": 0.1}}
assert ACCEPT(point, zone, "dkss_idw", 0.2, candidate_valid_time="2026-08-19T12:00:00Z", reference_time=reference) is True

print("OK: et halepar kan ikke rydde aktuel strøm; aktuelle bedre par og recovery uden aktuelt anker er bevaret.")
