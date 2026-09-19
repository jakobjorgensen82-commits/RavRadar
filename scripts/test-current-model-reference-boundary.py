"""Offline boundary: legacy current projections bind no forecast model age."""
from lib.copernicus_current import (
    RECORD_PROJECTION_CONTRACT_ID as CP_CONTRACT,
    live_record_projection_sha256 as cp_projection,
)
from lib.open_meteo_current_fallback import (
    LIVE_RECORD_PROJECTION_CONTRACT_ID as OM_CONTRACT,
    live_record_projection_sha256 as om_projection,
)


for contract, project in ((CP_CONTRACT, cp_projection), (OM_CONTRACT, om_projection)):
    entry = {
        "recordProjectionContractId": contract,
        "samplingPoint": [0, 0], "gridPoint": [0, 0], "distanceKm": 0,
        "verticalLayerM": 1, "sharedLayerCount": 1, "uMps": 0.1, "vMps": 0.2,
        "acquisitionAt": "2026-09-19T00:00:00Z",
    }
    # The existing value/hash contract is unchanged, including unknown age.
    assert project(entry) == project({**entry, "modelRun": None, "modelReference": None})
    for unbound in (
        {"modelRun": entry["acquisitionAt"]},
        {"modelReference": {"kind": "response-forecast-reference-time"}},
    ):
        try:
            project({**entry, **unbound})
        except ValueError:
            pass
        else:
            raise AssertionError("Legacy projection admitted unbound model-reference metadata")

print("Current v1 projection model-reference boundary passed for CP and OM.")
