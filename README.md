# RecallScope

RecallScope compares a printed product lot with versioned FDA recall records and publishes a GenLayer decision with the scope clause and fingerprints needed to audit it.

- [Public lookup](https://recallscope.tinymule33.chatgpt.site)
- [StudioNet contract](https://explorer-studio.genlayer.com/address/0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff)
- [Open deployed contract in Studio](https://studio.genlayer.com/?import-contract=0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff)
- [Live verification](docs/LIVE_VERIFICATION.md)

## Try it

1. Look up lot `EP250324` against **Original only**, then against **Original + expansion**.
2. Look up lot `EP250325` against **Original + expansion**.
3. Open the decision's FDA record, pinned scope snapshot and transaction from the result card.

The MVP covers Medline model `D087031RH`, UDI-DI `10197344019557`, and two FDA recall records. The FDA records specify explicit lot lists. They contain no independent manufacturing-date condition, so the app asks for the complete printed lot identifier. A decision is scoped to the selected notice versions and does not certify product safety. Use the FDA notices for current instructions.

## Contract design

`check_lot(model, lot, stage)` normalizes the product and lot, restricts inputs to the configured model and notice sets, and runs evidence retrieval and matching under GenLayer's strict equivalence principle. Each validator independently fetches the required scope documents from immutable GitHub commit URLs. Each snapshot is a canonical three-field extract of a specific FDA record, pinned by SHA-256 in contract source. Validators must agree on document IDs, verified content, decisive clauses, lot membership and the verdict. Source content is parsed as data with a bounded grammar. User-controlled URLs and free-form prompts are absent.

| Verdict | Rule |
| --- | --- |
| `COVERED` | At least one verified notice lists the full lot code |
| `OUTSIDE_NOTICE_SCOPE` | Every required notice verifies and none lists the lot |
| `INSUFFICIENT_EVIDENCE` | A required notice fails verification and no verified notice lists the lot |

The contract stores decisions by model, lot and notice set. A complete decision is idempotent. An insufficient-evidence result can be retried. `get_result` returns the record and decision SHA-256, or an empty string if no record exists. The site reads finalized state, links to Studio for native signing, and monitors a submitted hash via GenLayerJS. The hosted app never asks for a wallet secret.

## Develop and test

Requires Node.js 22+ and Python 3.10+.

```sh
npm ci
npm test
npm run build
python -m http.server 8080 --directory dist
```

Contract tests use pinned fixtures and a small GenLayer runtime stub. StudioNet evidence covers actual GenVM and network consensus. The public site runs on StudioNet, a development network. A broader rollout would need an indexed catalog of FDA records, version registration and supersession policies, and independent operational monitoring of source coverage.

## FDA sources

- [Original FDA record Z-2613-2025](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfres/res.cfm?id=215768)
- [FDA expansion record Z-1323-2026](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfres/res.cfm?id=218129)
