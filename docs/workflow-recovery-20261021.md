# Workflow recovery, 2026-10-21

The live report query and save failures coincided with the existing Supabase
project being INACTIVE. It was restored through the project management API;
the production database health check subsequently returned HTTP 200 with
`supabase.ok=true`. No schema, permissions, plan or historical report was changed.

Workflow 1.13.0 is published to the existing MCP service and included in the
website's handoff instructions. It requires per-case period statistics,
half-year-first and separately labelled year fallback for zero/insufficient
samples, reasoned subject-base estimates, and environment/market effects on
price, housing quality and sales. Missing data remains a draft, never a finding
about the site's defects or a zero-sales claim.

The report reader now recognizes numbered case headings without splitting on
the `競案等級` field. Excel preserves compound room labels, displays sample
qualifiers and provides a readable `成交統計` sheet for complete period/count/
price/parking limitations while preserving the fixed brief's dimensions.

PDF is a real authenticated-by-existing-policy download operation, rather than
only `window.print()`. It rejects incomplete templates and contradictory reports,
retains draft labelling, embeds Traditional Chinese text, wraps and paginates.
The font is downloaded at build time from a pinned Noto CJK commit and checked
against SHA-256; no report content or user data is sent to a rendering vendor.
Font bytes are traced into the deployment and no runtime font service is required.
The SIL Open Font License is retained in `assets/`.

The new readiness endpoint returns only service availability, never report data
or credentials. The UI checks availability before handoff and stops automatic
polling on server or network errors, preserving its local draft. This is a
readiness check, not a guarantee that a hosting provider will never pause again.

Validation: `npm test`, `npm run build`, PDF raster inspection, and a live browser
replay of input, manual draft save, refresh/reload, case rendering and downloads.
Program tests do not establish source completeness or official appraisal quality.
MCP `submitReport`, paid research APIs and Hermes must not be invoked during this
recovery verification. A manual website draft save is labelled as such.
