# RecallScope live verification

## StudioNet deployment

- Network — StudioNet, chain ID 61999
- [Contract address 0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff](https://explorer-studio.genlayer.com/address/0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff)
- [Finalized deployment receipt](https://explorer-studio.genlayer.com/tx/0xb7ef5dcd9395dcefc631483a6e43bd5cb438a8e3e6b6279a13415fe6144b5a9d)
- [Source-matched contract commit](https://github.com/amzar1st/RecallScope-Product-recall-matching/blob/f7eaf1ea2a122a6451f0bb789439bf5ed4206ce0/contracts/recall_scope.py)
- Source SHA-256 — `602931a82bb9287f0a6614c5e256a0fa4eb9362932cad89d4a2f58f40ceb3ccd`
- Built-in Studio account — `0x62750Bb60A705B27B96867c60665D47cCF5B1Dd7`
- Execution mode — Normal (Full Consensus)

The GenLayerJS `getContractCode` response matches the release source byte for byte.

## Finalized demo

| Lot | Notice set | Finalized result | Transaction |
| --- | --- | --- | --- |
| EP250324 | Original only | `OUTSIDE_NOTICE_SCOPE` | [Finalized receipt](https://explorer-studio.genlayer.com/tx/0xea1d8dfe2264a8a933e559ce488b4f05e89aba130ab7f73876a84eb4ae03b7b8) |
| EP250324 | Original + expansion | `COVERED` under Z-1323-2026 | [Finalized receipt](https://explorer-studio.genlayer.com/tx/0xc3d0537ca5be9a9c8505ab114fc6ffcf40c800710ab834d9c403f131591e2d75) |
| EP250325 | Original + expansion | `OUTSIDE_NOTICE_SCOPE` | [Finalized receipt](https://explorer-studio.genlayer.com/tx/0x7f4401afbe4a8f6e20cb50af53c8c2b1e24dbdec23aa919ca3f54d338e5b2776) |
| EP25032 | Original + expansion | Execution rejected a malformed lot | [Finalized failure receipt](https://explorer-studio.genlayer.com/tx/0x68343ba452c6510507c2e71e5ac60d72ced265e06c480971d7189b502a1ed70a) |

| Lot and stage | Decision SHA-256 |
| --- | --- |
| EP250324 original | `5b50e9289b915320ed57e0a30f7e0e00f99d9b55faf304263313a40e796faa0c` |
| EP250324 expanded | `edcff9626ffb618a0d30635229f0452ec9df02a502a121b1c1d0350eece9d7f8` |
| EP250325 expanded | `35467bdda76b5eda76edabc668ae4a5960589a074a84764bd9090b691c283332` |

The two verified scope clauses and their hashes are stored in the expanded records. Both receipts and the contract read use the same deployed address. The initial verification revisions surfaced an SDK response-field mismatch and returned insufficient evidence. The release address above uses the corrected web response handling.

## Reproduce

1. Open the [public expansion-lot result](https://recallscope.tinymule33.chatgpt.site/?lot=EP250324&stage=expanded) or [outside-scope result](https://recallscope.tinymule33.chatgpt.site/?lot=EP250325&stage=expanded).
2. Open the FDA record and pinned snapshot from the result. Select **Original only** and run the same lot to compare scope.
3. Open the [deployed contract in Studio](https://studio.genlayer.com/?import-contract=0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff), choose **Run and Debug**, and open `check_lot`. Enter model `D087031RH`, a complete lot code, and `original` or `expanded`. Use the built-in account and Full Consensus mode.
4. Paste the submitted hash into the public site's transaction tracker. Once the network finalizes a successful check, use the lookup to inspect the exact result.
5. To reproduce in a checkout, use `npm ci`, `npm test`, `npm run build`, and the live check below.

```sh
node tests/verify-live.mjs 0x68343ba452c6510507c2e71e5ac60d72ced265e06c480971d7189b502a1ed70a
```

The suite checks exact lot membership, positive matches with a missing secondary source, fail-closed negative matches, tampering, malformed evidence, retry, idempotency, and frontend handling of pending, finalized and failed transactions. The live script verifies the source match, sender, full-consensus flag, receipt execution results and decision fingerprints.

## Limits

The records are historical snapshots for one model. A material change in official scope requires a new reviewed snapshot/version. The project does not perform a catalog-wide search. Signing occurs in the separate Studio tab, and StudioNet may reset.

## Public browser verification

On 2026-11-12 the public site displayed the finalized covered and outside-scope demo records, and distinguished the previously rejected malformed transaction from a successful finalized check. A second built-in Studio account opened the contract through the site's import link and submitted EP250325 against the original notice. The public tracker displayed `ACCEPTED` while awaiting finalization, then `FINALIZED` and refreshed the original-only decision to `OUTSIDE_NOTICE_SCOPE`.

- [Public original-only decision](https://recallscope.tinymule33.chatgpt.site/?lot=EP250325&stage=original)
- [Finalized browser lifecycle receipt](https://explorer-studio.genlayer.com/tx/0x1d502d5710241536cecab73044706ae4396ceec8af849437838d4856d4fcb93e)
- Decision SHA-256 — `372b37ba87adda408bcf24992190ad237d95dd0007f52dc9d2050e4cdc81a19d`
