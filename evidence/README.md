# FDA scope snapshots

The two JSON files capture the Recall Number, Product, and Code Information cells in that order. Source pages are the FDA Medical Device Recall database records [215768](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfres/res.cfm?id=215768) and [218129](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfres/res.cfm?id=218129). They were retrieved on 2026-11-11.

To reproduce the normalization, extract the unique table cells for those labels, strip HTML markup, uppercase the resulting text, and join runs matching `[A-Z0-9/-]+` with a single space. Serialize the three strings as a compact JSON array with UTF-8, no trailing newline, and no whitespace outside the strings. The contract computes SHA-256 from the compact array after JSON parsing and requires the exact pinned hash.

The model and UDI are checked before using an explicit lot list. The later record expands the earlier recall series. The original-only lookup uses the original FDA record as published when captured, which can itself include prior updates. The expanded lookup uses the union of the two pinned lot lists. The later FDA record's amendment text does not identify which single lot was added in May 2026, so RecallScope makes no such attribution.
