import ast
import math
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("update-dmi-bulk.py")
TREE = ast.parse(MODULE_PATH.read_text("utf-8"), filename=str(MODULE_PATH))
FUNCTION = next(
    node for node in TREE.body
    if isinstance(node, ast.FunctionDef) and node.name == "prefer_current_hour_candidate"
)
NAMESPACE = {
    "Any": object,
    "math": math,
    "CURRENT_MAX_DISTANCE_KM": 5.0,
    "COLLECTION_ORDER": ["dkss_idw", "dkss_nsbs", "dkss_lf"],
    "epoch": lambda value: datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp() if value else 0.0,
}
exec(compile(ast.Module(body=[FUNCTION], type_ignores=[]), str(MODULE_PATH), "exec"), NAMESPACE)
PREFER = NAMESPACE["prefer_current_hour_candidate"]


def selected_nsbs_point(valid_time="2026-08-15T12:00:00Z"):
    return {
        "hourly": {
            valid_time: {
                "current-u": 0.1,
                "current-v": -0.2,
                "sources": {"current": {
                    "provider": "dmi", "collection": "dkss_nsbs",
                    "modelRun": "2026-08-15T00:00:00Z",
                    "gridPoint": [10.2, 56.1], "distanceKm": 3.0,
                    "verticalLayerRankM": 4.0,
                }},
            },
        },
    }


def choice(distance, point=(56.1, 10.2), layer=4.0):
    return {"distanceKm": distance, "pointKey": point, "layerRank": layer}


valid = "2026-08-15T12:00:00Z"

# Coast-type model preference cannot make a farther current column win.
point = selected_nsbs_point()
assert PREFER(point, valid, "dkss_idw", "2026-08-15T06:00:00Z", choice(4.9, (56.2, 10.3))) is False

# A closer shared U/V column wins on the same native time across collections.
point = selected_nsbs_point()
assert PREFER(point, valid, "dkss_idw", "2026-08-15T06:00:00Z", choice(2.8, (56.2, 10.3))) is True

# Depth can decide only in the exact same physical column.
point = selected_nsbs_point()
assert PREFER(point, valid, "dkss_nsbs", "2026-08-15T06:00:00Z", choice(3.0, layer=7.0)) is True
assert PREFER(point, valid, "dkss_nsbs", "2026-08-15T06:00:00Z", choice(3.0, layer=2.0)) is False

# A different native time can be filled without mutating the current time.
future = "2026-08-19T12:00:00Z"
point = selected_nsbs_point()
assert PREFER(point, future, "dkss_idw", "2026-08-15T06:00:00Z", choice(2.8, (56.2, 10.3))) is True
assert point["hourly"][valid]["current-u"] == 0.1

# More than five kilometres is always missing.
assert PREFER({}, valid, "dkss_idw", "2026-08-15T06:00:00Z", choice(5.0001)) is False

print("OK: current is selected per native time by nearest shared U/V column, then depth.")
