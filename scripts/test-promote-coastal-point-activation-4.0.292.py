#!/usr/bin/env python3
import importlib.util
import json
import pathlib
import tempfile


SCRIPT = pathlib.Path(__file__).with_name("promote-coastal-point-activation.py")
SPEC = importlib.util.spec_from_file_location("promote_coastal_point_activation", SCRIPT)
module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(module)


with tempfile.TemporaryDirectory(prefix="ravradar-point-promotion-") as directory:
    pending_path = pathlib.Path(directory) / "pending.json"
    central = {
        "document_key": "direction-reviews",
        "version": 4,
        "payload": {
            "schemaVersion": 3,
            "zones": {
                "DK-TEST": {
                    "status": "verified",
                    "stagedChange": {
                        "revision": "revision-000000001",
                        "status": "activation-requested",
                        "partOverrides": {"part-1": {"waterPoint": [10, 56]}},
                    },
                },
            },
        },
    }
    promoted = {
        "schemaVersion": 3,
        "zones": {"DK-TEST": {"status": "verified", "activePartOverrides": {"part-1": {"waterPoint": [10, 56]}}, "stagedChange": None}},
    }
    pending_path.write_text(json.dumps({
        "schemaVersion": 1,
        "preparedAt": "2026-08-28T13:00:00.000Z",
        "documentKey": "direction-reviews",
        "expectedVersion": 4,
        "revisions": ["revision-000000001"],
        "partIds": ["part-1"],
        "payload": promoted,
    }), "utf-8")
    calls = []

    def request_json(_url, *, method="GET", payload=None):
        calls.append((method, payload))
        if method == "PATCH":
            assert payload["payload"] == promoted
            central["payload"] = promoted
            central["version"] = 5
            return [{"document_key": "direction-reviews", "version": 5}]
        return [central.copy()]

    module.PENDING = pending_path
    module.URL = "https://example.supabase.co"
    module.KEY = "test-service-key"
    module.request_json = request_json
    assert module.main() == 0
    assert central["version"] == 5
    assert [method for method, _payload in calls].count("PATCH") == 1

    central["version"] = 6
    central["payload"] = {
        "zones": {"DK-TEST": {"stagedChange": {"revision": "newer-revision-0001", "status": "activation-requested"}}},
    }
    try:
        module.main()
    except RuntimeError as error:
        assert "version changed" in str(error)
    else:
        raise AssertionError("A stale central version must stop activation")

print("Atomic central coastal-point promotion: OK")
