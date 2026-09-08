#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import pathlib
import tempfile
import unittest

from lib.dmi_bulk_storage import (
    decode_dmi_bulk_wrapper,
    encode_dmi_bulk_document,
    read_dmi_bulk_document,
    write_dmi_bulk_document,
)


def fixture():
    source = {
        "collection": "dkss_lf", "modelRun": "2026-09-08T12:00:00Z",
        "itemId": "private-test", "gridPoint": [1.0, 2.0], "provider": "dmi",
        "future": {"nested": [True, None, "ø"]}, "__proto__": {"safe": True},
    }
    return {"schemaVersion": 2, "zones": {"PART::T": {"hourly": {
        "2026-09-08T12:00:00Z": {"time": "2026-09-08T12:00:00Z", "sources": {
            "current": source, "wave": copy.deepcopy(source),
        }},
    }}}}


class StorageTest(unittest.TestCase):
    def test_lossless_roundtrip_and_no_mutable_alias(self):
        expected = fixture()
        wrapper = encode_dmi_bulk_document(expected)
        decoded = decode_dmi_bulk_wrapper(copy.deepcopy(wrapper))
        self.assertEqual(decoded, expected)
        sources = next(iter(next(iter(decoded["zones"].values()))["hourly"].values()))["sources"]
        sources["current"]["gridPoint"][0] = 99
        self.assertEqual(sources["wave"]["gridPoint"], [1.0, 2.0])

    def test_file_reader_accepts_legacy_and_writer_normalizes(self):
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory) / "dmi.json"
            target.write_text(json.dumps(fixture()), encoding="utf-8")
            self.assertEqual(read_dmi_bulk_document(target), fixture())
            logical = read_dmi_bulk_document(target)
            write_dmi_bulk_document(target, logical)
            stored = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(stored["storageSchema"], "dmi-bulk-source-dictionary-v1")
            self.assertEqual(read_dmi_bulk_document(target), fixture())

    def test_rejects_boolean_reference_and_partition_overlap(self):
        malformed = encode_dmi_bulk_document(fixture())
        source = next(iter(next(iter(malformed["document"]["zones"].values()))["hourly"].values()))["sources"]
        source["current"]["$dmiSource"][0] = True
        with self.assertRaises(ValueError):
            decode_dmi_bulk_wrapper(malformed)

    def test_late_invalid_reference_does_not_partially_expand(self):
        malformed = encode_dmi_bulk_document(fixture())
        sources = next(iter(next(iter(malformed["document"]["zones"].values()))["hourly"].values()))["sources"]
        sources["wave"]["$dmiSource"][2] = 999
        before = copy.deepcopy(malformed)
        with self.assertRaises(ValueError):
            decode_dmi_bulk_wrapper(malformed)
        self.assertEqual(malformed, before)

    def test_rejects_deep_table_before_expansion(self):
        malformed = encode_dmi_bulk_document(fixture())
        nested = {}
        cursor = nested
        for _ in range(70):
            cursor["child"] = {}
            cursor = cursor["child"]
        malformed["sourceTables"]["semantics"][0]["deep"] = nested
        before = copy.deepcopy(malformed)
        with self.assertRaises(ValueError):
            decode_dmi_bulk_wrapper(malformed)
        self.assertEqual(malformed, before)
        malformed = encode_dmi_bulk_document(fixture())
        malformed["sourceTables"]["semantics"][0]["gridPoint"] = [3, 4]
        with self.assertRaises(ValueError):
            decode_dmi_bulk_wrapper(malformed)


if __name__ == "__main__":
    unittest.main()
