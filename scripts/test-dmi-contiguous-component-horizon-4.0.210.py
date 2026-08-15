import ast
import math
import time
from datetime import datetime, timezone
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("update-dmi-bulk.py")
TREE = ast.parse(MODULE_PATH.read_text("utf-8"), filename=str(MODULE_PATH))
FUNCTION = next(node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name == "component_horizon_hours")
def epoch(value):
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()


NAMESPACE = {"math": math, "time": time, "epoch": epoch, "TIME_STRIDE_HOURS": 3, "Any": object}
exec(compile(ast.Module(body=[FUNCTION], type_ignores=[]), str(MODULE_PATH), "exec"), NAMESPACE)
COMPONENT_HORIZON_HOURS = NAMESPACE["component_horizon_hours"]

NOW = datetime(2026, 8, 15, 0, 0, tzinfo=timezone.utc).timestamp()
REQUIRED = ("sea-mean-deviation", "current-u", "current-v")


def zone(hours):
    rows = {}
    for hour in hours:
        valid = datetime.fromtimestamp(NOW + hour * 3600, timezone.utc).isoformat().replace("+00:00", "Z")
        rows[valid] = {"time": valid, "sea-mean-deviation": 0.1, "current-u": 0.2, "current-v": -0.1}
    return {"hourly": rows}


assert COMPONENT_HORIZON_HOURS(zone([96, 99, 102]), REQUIRED, NOW) == 0
assert COMPONENT_HORIZON_HOURS(zone(range(0, 100, 3)), REQUIRED, NOW) == 99
assert COMPONENT_HORIZON_HOURS(zone([0, 3, 6, 48, 51]), REQUIRED, NOW) == 6
assert COMPONENT_HORIZON_HOURS(zone([0, 3, 6]), REQUIRED, NOW) == 6

broken = zone([0, 3, 6])
first = next(iter(broken["hourly"].values()))
first["current-u"] = None
assert COMPONENT_HORIZON_HOURS(broken, REQUIRED, NOW) == 6

print("OK: DMI-dækning kræver en sammenhængende komponentserie fra nutiden; en fjern prognosehale tæller ikke.")
