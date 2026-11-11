import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
fake = types.ModuleType("genlayer")
fake.TreeMap = dict
fake.gl = types.SimpleNamespace(
    Contract=object,
    public=types.SimpleNamespace(view=lambda method: method, write=lambda method: method),
)
with patch.dict(sys.modules, {"genlayer": fake}):
    spec = importlib.util.spec_from_file_location("recall_scope", ROOT / "contracts/recall_scope.py")
    recall = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recall)


def fixture(url):
    return (ROOT / "evidence" / url.rsplit("/", 1)[-1]).read_text()


class RecallScopeTest(unittest.TestCase):
    def test_pins_match_fda_snapshots(self):
        for page, number, digest in recall.NOTICES:
            with self.subTest(page=page):
                actual, _, _, fingerprint = recall.notice(fixture(page + ".json"))
                self.assertEqual((actual, fingerprint), (number, digest))

    def test_expansion_adds_lot(self):
        before = recall.adjudicate("original", "EP250324", fixture)
        after = recall.adjudicate("expanded", "EP250324", fixture)
        self.assertEqual(before["verdict"], "OUTSIDE_NOTICE_SCOPE")
        self.assertEqual(after["verdict"], "COVERED")
        self.assertEqual(after["covered_by"], ["Z-1323-2026"])

    def test_absence_from_both_lists(self):
        result = recall.adjudicate("expanded", "EP250325", fixture)
        self.assertEqual(result["verdict"], "OUTSIDE_NOTICE_SCOPE")
        self.assertTrue(all(item["state"] == "VERIFIED" for item in result["notices"]))

    def test_one_valid_positive_survives_missing_other_notice(self):
        def partial(url):
            if url.endswith("215768.json"):
                raise OSError("outage")
            return fixture(url)
        self.assertEqual(recall.adjudicate("expanded", "EP250324", partial)["verdict"], "COVERED")
        self.assertEqual(recall.adjudicate("expanded", "EP250325", partial)["verdict"], "INSUFFICIENT_EVIDENCE")

    def test_tampered_snapshot_cannot_add_lot(self):
        def tampered(url):
            return fixture(url).replace("EP250324", "EP250325")
        result = recall.adjudicate("expanded", "EP250325", tampered)
        self.assertEqual(result["verdict"], "INSUFFICIENT_EVIDENCE")

    def test_ambiguous_or_malformed_evidence(self):
        malformed = ('{}', '["id",{},"scope"]', 'a' * 4097)
        for snapshot in malformed:
            with self.subTest(snapshot=snapshot[:40]):
                self.assertEqual(recall.adjudicate("original", "EP250324", lambda _: snapshot)["verdict"],
                                 "INSUFFICIENT_EVIDENCE")

    def test_normalizes_input_and_rejects_other_models_and_partial_codes(self):
        self.assertEqual(recall.query(" d087031rh ", " ep241209a ", "original"),
                         ("D087031RH", "EP241209A", "original"))
        for args in [("wrong", "EP250324", "original"),
                     ("D087031RH", "EP25032", "original"),
                     ("D087031RH", "EP250324", "other")]:
            with self.assertRaises(ValueError):
                recall.query(*args)

    def test_contract_storage_idempotency_and_retry(self):
        calls = []
        available = False

        def get(url):
            calls.append(url)
            if not available:
                return types.SimpleNamespace(status=503, body=b"")
            return types.SimpleNamespace(status=200, body=fixture(url).encode())

        fake.gl.eq_principle = types.SimpleNamespace(strict_eq=lambda callback: callback())
        fake.gl.nondet = types.SimpleNamespace(web=types.SimpleNamespace(get=get))
        contract = recall.RecallScope()
        contract.results = {}
        args = ("D087031RH", "EP250324", "expanded")
        self.assertEqual(contract.get_result(*args), "")
        contract.check_lot(*args)
        self.assertEqual(json.loads(contract.get_result(*args))["verdict"], "INSUFFICIENT_EVIDENCE")
        available = True
        contract.check_lot(*args)
        resolved = json.loads(contract.get_result(*args))
        self.assertEqual(resolved["verdict"], "COVERED")
        self.assertEqual(resolved.pop("decision_hash"), recall.digest(recall.encode(resolved)))
        contract.check_lot(*args)
        self.assertEqual(len(calls), 4)
