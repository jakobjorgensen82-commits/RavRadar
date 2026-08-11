#!/usr/bin/env python3
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).with_name("sync-admin-config.py")
SPEC = importlib.util.spec_from_file_location("sync_admin_config", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def manifest(version, active=True, approved=True):
    return {
        "sourceVersion": version,
        "status": "owner-approved-national-public-coast-active" if approved else "generated",
        "publicActivation": active,
        "automaticActivationAllowed": False,
        "activationAuthority": "explicit owner approval" if approved else "",
    }


class ActivationPrecedenceTest(unittest.TestCase):
    def test_newer_explicit_owner_activation_crosses_central_boundary(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.182"), manifest("4.0.181")))

    def test_equal_version_keeps_central_rollback_authoritative(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.182"), manifest("4.0.182", active=False)))

    def test_unapproved_or_inactive_local_manifest_never_wins(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.183", approved=False), manifest("4.0.182")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.183", active=False), manifest("4.0.182")))

    def test_invalid_or_older_versions_never_win(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("next"), manifest("4.0.182")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.181"), manifest("4.0.182")))


if __name__ == "__main__":
    unittest.main()
