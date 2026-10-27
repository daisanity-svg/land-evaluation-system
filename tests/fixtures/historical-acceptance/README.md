# Historical acceptance baseline

These seven inputs come from existing acceptance artifacts, not new research.
Each JSON records the original source path and SHA-256. The only rewritten
metadata is the test client and report ID. Shanling 502 is transcribed by
joining the original Excel full-text worksheet cells, not PDF OCR or invented data.

Run `npm run test:historical`; set `HISTORICAL_OUTPUT` to save local regression
outputs and machine-readable results. The suite is also included in `npm test`.

The suite checks full-text retention, comparable card names, Excel/PDF generation
and that incomplete historical inputs are not promoted to reviewed reports.
Export success does not certify factual accuracy, transaction completeness,
current official-source verification, or the ChatGPT/MCP return workflow.

## 2026-10-27 baseline

All seven inputs remained preliminary. Local export checks passed for Qingping
399, Keyun 62, Caoxin 195, Lilin 239, Jieshou 479, Shanling 502 and Fulin 192.
The previous research quality failures remain open.

Live production UI was exercised with Lilin 239 -> Jieshou 479 -> Shanling 502
without saving or submitting formal reports. Excel files for all three and PDF
files for Lilin/Shanling were physically retrieved and inspected. The Jieshou PDF
download event returned a path but no physical file was available; download
stability is therefore not accepted. Its cause is not yet established.

Full live research from parcel input through MCP submission was not tested.
Gaoshi 905 is excluded because its original output has not been located.
Historical figures remain historical observations, not current verified facts.
