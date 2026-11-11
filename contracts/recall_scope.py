# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib
import json
import re

BASE = "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfres/res.cfm?id="
SNAPSHOTS = ("https://raw.githubusercontent.com/amzar1st/"
             "RecallScope-Product-recall-matching/e6051fdf58a411526a5a4956dd87a62145bd6389/evidence/")
MODEL = "D087031RH"
UDI = "10197344019557"
NOTICES = (
    ("215768", "Z-2613-2025", "235aae23e411096eb8e2912b4a1ab58b6e9dd909c6c72c036b99704ac038b613"),
    ("218129", "Z-1323-2026", "4850cc9e0555c26b13faad79444d6ff66419c9fa21da44ff9a61d17c0f2cb01e"),
)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def encode(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def notice(snapshot: str) -> tuple:
    if len(snapshot) > 4096:
        raise ValueError("Scope snapshot too large")
    fields = json.loads(snapshot)
    if (not isinstance(fields, list) or len(fields) != 3
            or any(not isinstance(value, str) for value in fields)):
        raise ValueError("Invalid scope snapshot")
    number, product, clause = fields
    prefix, marker, list_text = clause.partition(" LOTS ")
    lots = list_text.split()
    if (not marker or MODEL not in product.split() or UDI not in prefix.split()
            or not lots or len(lots) > 80 or len(lots) != len(set(lots))
            or any(not re.fullmatch(r"EP[0-9]{6}[A-Z]?", code) for code in lots)):
        raise ValueError("Unexpected FDA scope format")
    return number, clause, lots, digest(encode([number, product, clause]))


def adjudicate(stage: str, lot: str, fetch) -> dict:
    records = []
    unavailable = False
    covered_by = []
    for page_id, expected_number, pin in NOTICES[:1 if stage == "original" else 2]:
        snapshot_url = SNAPSHOTS + page_id + ".json"
        record = {"id": expected_number, "url": BASE + page_id,
                  "snapshot_url": snapshot_url, "sha256": pin}
        try:
            number, clause, lots, actual = notice(fetch(snapshot_url))
            if number != expected_number or actual != pin:
                raise ValueError("Notice changed")
            match = lot in lots
            record.update({"state": "VERIFIED", "clause": clause, "lot_match": match})
            if match:
                covered_by.append(number)
        except Exception:
            unavailable = True
            record["state"] = "UNVERIFIED"
        records.append(record)
    verdict = "OUTSIDE_NOTICE_SCOPE"
    if covered_by:
        verdict = "COVERED"
    elif unavailable:
        verdict = "INSUFFICIENT_EVIDENCE"
    return {"verdict": verdict, "notices": records, "covered_by": covered_by}


def query(model: str, lot: str, stage: str) -> tuple:
    if len(model) > 32 or len(lot) > 32 or len(stage) > 16:
        raise ValueError("Input too long")
    model = model.strip().upper()
    lot = lot.strip().upper()
    if model != MODEL:
        raise ValueError("Unsupported model")
    if not re.fullmatch(r"EP[0-9]{6}[A-Z]?", lot):
        raise ValueError("Enter the full printed lot code")
    if stage not in ("original", "expanded"):
        raise ValueError("Unknown notice set")
    return model, lot, stage


class RecallScope(gl.Contract):
    results: TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.view
    def get_result(self, model: str, lot: str, stage: str) -> str:
        return self.results.get(encode(query(model, lot, stage)), "")

    @gl.public.write
    def check_lot(self, model: str, lot: str, stage: str) -> None:
        model, lot, stage = query(model, lot, stage)
        key = encode([model, lot, stage])
        previous = self.results.get(key, "")
        if previous and json.loads(previous)["verdict"] != "INSUFFICIENT_EVIDENCE":
            return

        def resolve() -> str:
            def fetch(url: str) -> str:
                response = gl.nondet.web.get(url)
                status = getattr(response, "status", getattr(response, "status_code", 0))
                if status != 200 or response.body is None or len(response.body) > 4096:
                    raise ValueError("FDA request failed")
                return response.body.decode("utf-8", errors="replace")

            return encode(adjudicate(stage, lot, fetch))

        result = json.loads(gl.eq_principle.strict_eq(resolve))
        result.update({"model": model, "lot": lot, "stage": stage})
        result["decision_hash"] = digest(encode(result))
        self.results[key] = encode(result)
