#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

from lib.dmi_bulk_storage import (
    decode_dmi_bulk_wrapper,
    encode_dmi_bulk_document,
    materialize_dmi_bulk_document,
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

    def test_materializer_preserves_legacy_source_and_writes_encoded_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "legacy.json"
            output = pathlib.Path(directory) / "materialized.json"
            source.write_text(json.dumps(fixture()), encoding="utf-8")
            before = source.read_bytes()
            result = materialize_dmi_bulk_document(source, output)
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(read_dmi_bulk_document(output), fixture())
            self.assertTrue(result["legacyNormalized"])
            self.assertEqual(result["inputBytes"], len(before))
            self.assertEqual(result["outputBytes"], output.stat().st_size)

    def test_materializer_accepts_a_legacy_file_above_the_stored_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "legacy.json"
            output = pathlib.Path(directory) / "materialized.json"
            logical = fixture()
            template = next(iter(logical["zones"].values()))
            logical["zones"] = {
                f"PART::{index}": copy.deepcopy(template)
                for index in range(40)
            }
            source.write_text(json.dumps(logical), encoding="utf-8")
            probe = pathlib.Path(directory) / "probe.json"
            write_dmi_bulk_document(probe, copy.deepcopy(logical))
            stored_limit = probe.stat().st_size + 1
            self.assertLess(stored_limit, source.stat().st_size)
            before = source.read_bytes()
            with patch("lib.dmi_bulk_storage.MAX_STORED_BYTES", stored_limit):
                result = materialize_dmi_bulk_document(source, output)
                self.assertEqual(read_dmi_bulk_document(output), logical)
            self.assertEqual(source.read_bytes(), before)
            self.assertTrue(result["legacyNormalized"])

    def test_materializer_copies_valid_encoded_input_byte_for_byte(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "encoded.json"
            output = pathlib.Path(directory) / "materialized.json"
            write_dmi_bulk_document(source, fixture())
            before = source.read_bytes()
            result = materialize_dmi_bulk_document(source, output)
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(output.read_bytes(), before)
            self.assertFalse(result["legacyNormalized"])

    def test_oversize_encoded_wrapper_is_never_treated_as_legacy(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "encoded.json"
            write_dmi_bulk_document(source, fixture())
            with patch("lib.dmi_bulk_storage.MAX_STORED_BYTES", 8):
                with self.assertRaisesRegex(ValueError, "encoded input exceeds"):
                    read_dmi_bulk_document(
                        source,
                        allow_large_legacy=True,
                        expand_sources=False,
                    )

    def test_materializer_failure_preserves_source_and_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "invalid.json"
            output = pathlib.Path(directory) / "materialized.json"
            source.write_text('{"invalid":true}', encoding="utf-8")
            output.write_bytes(b"previous-output")
            before = source.read_bytes()
            with self.assertRaises(ValueError):
                materialize_dmi_bulk_document(source, output)
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(output.read_bytes(), b"previous-output")

    def test_materializer_write_failure_preserves_source_and_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "legacy.json"
            output = pathlib.Path(directory) / "materialized.json"
            source.write_text(json.dumps(fixture()), encoding="utf-8")
            output.write_bytes(b"previous-output")
            before = source.read_bytes()
            with patch(
                "lib.dmi_bulk_storage.write_dmi_bulk_document",
                side_effect=OSError("private-test-write-failure"),
            ):
                with self.assertRaises(OSError):
                    materialize_dmi_bulk_document(source, output)
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(output.read_bytes(), b"previous-output")

    def test_materializer_rejects_in_place_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "legacy.json"
            source.write_text(json.dumps(fixture()), encoding="utf-8")
            before = source.read_bytes()
            with self.assertRaisesRegex(ValueError, "separate output"):
                materialize_dmi_bulk_document(source, source)
            self.assertEqual(source.read_bytes(), before)

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
