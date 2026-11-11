# Project Explorer submission

**Contribution type** Builder → Projects

**Project name** RecallScope

**Suggested tags** Real-World Data, Oracles, Supply Chain. Select the closest available tags in the Explorer form.

**One-liner**

Check a product lot against pinned FDA recall notices and see the decisive clause and finalized GenLayer verdict.

**Overview**

RecallScope helps procurement and inventory teams determine whether a printed lot falls within specific official recall notices. Its GenLayer Intelligent Contract uses strict equivalence to make validators independently fetch SHA-256-pinned snapshots of two FDA recall records, validate the model and notice identifiers, and agree on the decisive lot list and verdict. It stores the evidence and decision hash and returns COVERED, OUTSIDE_NOTICE_SCOPE, or INSUFFICIENT_EVIDENCE. The public site reads finalized StudioNet decisions, links each clause to the FDA record and pinned snapshot, and tracks transactions submitted through GenLayer Studio's built-in account. The MVP compares two lots of the same catheter model before and after the FDA follow-up expanded the list.

**Links**

- [Frontend](https://recallscope.tinymule33.chatgpt.site)
- [GitHub](https://github.com/amzar1st/RecallScope-Product-recall-matching)
- [Contract source](https://github.com/amzar1st/RecallScope-Product-recall-matching/blob/main/contracts/recall_scope.py)
- [Studio contract](https://studio.genlayer.com/?import-contract=0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff)
- [Explorer contract](https://explorer-studio.genlayer.com/address/0x14062fBbC5C4b62d89dcE4D3beF6260b4DCd15Ff)
- [Deployment transaction](https://explorer-studio.genlayer.com/tx/0xb7ef5dcd9395dcefc631483a6e43bd5cb438a8e3e6b6279a13415fe6144b5a9d)
- [Live verification](https://github.com/amzar1st/RecallScope-Product-recall-matching/blob/main/docs/LIVE_VERIFICATION.md)
