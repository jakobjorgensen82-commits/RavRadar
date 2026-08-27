#!/usr/bin/env python3
import json
import pathlib
import tempfile

from lib.coastal_point_staging import (
    load_private_document,
    save_private_document,
    stage_asset_complete,
    staged_targets,
)


active = {
    "zones": {
        "DK-TEST": [{
            "partId": "part-1",
            "waterPoint": [10.0, 56.0],
            "landPoint": [10.01, 56.0],
            "onshoreDirectionDeg": 90,
        }, {
            "partId": "part-2",
            "waterPoint": [10.2, 56.1],
            "landPoint": [10.21, 56.1],
            "onshoreDirectionDeg": 90,
        }],
    },
}
candidate = {
    "partId": "part-1",
    "waterPoint": [10.001, 56.0],
    "landPoint": [10.01, 56.0],
    "onshoreDirectionDeg": 90,
}
reviews = {
    "zones": {
        "DK-TEST": {
            "status": "verified",
            "stagedChange": {
                "revision": "candidate-0000000001",
                "status": "awaiting-validation",
                "partOverrides": {
                    "part-1": candidate,
                    "part-2": active["zones"]["DK-TEST"][1],
                },
            },
        },
    },
}
targets = staged_targets(reviews, active, {"DK-TEST": "east"})
assert len(targets) == 1
assert targets[0]["partId"] == "part-1"
assert targets[0]["privateStage"] is True

with tempfile.TemporaryDirectory(prefix="ravradar-point-stage-") as directory:
    file = pathlib.Path(directory) / "dmi.json"
    document = load_private_document(file, targets)
    stage_id = targets[0]["id"]
    assert document["zones"][stage_id]["samplingPoint"] == candidate["waterPoint"]
    valid = "2026-08-28T12:00:00.000Z"
    document["zones"][stage_id]["hourly"][valid] = {
        "time": valid,
        "current-u": 0.1,
        "current-v": 0.2,
        "sea-mean-deviation": 0.1,
    }
    assert stage_asset_complete(document, targets, "dkss_idw", valid)
    assert not stage_asset_complete(document, targets, "wam_dw", valid)
    save_private_document(file, document)
    saved = json.loads(file.read_text("utf-8"))
    assert saved["candidates"][stage_id]["waterPoint"] == candidate["waterPoint"]

changed_revision = json.loads(json.dumps(reviews))
changed_revision["zones"]["DK-TEST"]["stagedChange"]["revision"] = "candidate-0000000002"
new_targets = staged_targets(changed_revision, active, {"DK-TEST": "east"})
loaded = load_private_document(file, new_targets)
assert list(loaded["zones"]) == [new_targets[0]["id"]]
assert loaded["zones"][new_targets[0]["id"]]["hourly"] == {}
print("Private staged coastal-point DMI isolation: OK")
