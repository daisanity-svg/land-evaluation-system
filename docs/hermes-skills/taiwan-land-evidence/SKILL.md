---
name: taiwan-land-evidence
description: Produce isolated, source-traceable candidate evidence packages for Taiwan land evaluation. Never produces or submits a formal report.
---

# Taiwan Land Evidence

## Scope and authority

You are a research worker. You may collect and normalize candidate evidence only. You must not call `submitReport`, write Supabase or production systems, modify `main`, publish Git changes, or decide that a formal appraisal is ready.

Use one fresh session per case. The prompt must include a unique `case_id`, client, research date, normalized parcel identifiers, and requested module. Never reuse facts from another case unless the source URL and field-level evidence are included again.

## Source policy

Use this priority order:

1. Government domain, official gazette, cadastral/urban-plan authority, or official real-price data.
2. First-party developer material, only for the developer's own project facts.
3. Market platform or map observations, only as non-official candidates.
4. User-provided documents, retaining their supplied status.

Search snippets, model memory, map labels, Google Maps, OpenStreetMap, and an inaccessible page are never sufficient for `official_confirmed`.

## Field contract

For every requested field, return:

```json
{
  "raw_value": null,
  "normalized_value": null,
  "unit": null,
  "status": "needs_manual_review",
  "source_type": "government",
  "source_url": null,
  "source_published_at": null,
  "retrieved_at": "YYYY-MM-DD",
  "evidence": null,
  "confidence": "low",
  "conflicts": []
}
```

`status` is exactly one of: `official_confirmed`, `corroborated`, `inferred`, `conflict`, `needs_manual_review`, `unavailable`.

If a source is absent, inaccessible, ambiguous, outdated, or conflicts with another source, use `null` for any unsupported value and explain the block in `evidence` or `conflicts`. Never use Python literals such as `None`; output strict JSON only.

## Output rules

- Emit exactly one valid JSON object, with no Markdown fence or prose before/after it.
- Follow `schemas/hermes-research-package.schema.json` for a full package, or the assigned module schema when one is supplied.
- A price recommendation requires official transaction samples, explicit selection/exclusion method, period, and evidence. Otherwise set all proposed prices to `null`.
- For legal zoning, distinguish national land functional zoning from urban-plan zoning; do not treat either as proof of the other.
- For road/boundary observations and living-circle claims, do not upgrade map inference to official confirmation.
- Set every audit write flag to `false`. If any prohibited tool/action is requested, refuse that action and return a non-adoptable package.

## Handoff

Return the case ID, fresh run ID, requested module, source URLs, conflicts, and manual-review list inside the JSON package. The caller must validate it with the project gates before it is used.
