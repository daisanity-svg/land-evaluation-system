# Cross-chapter consistency recovery

The quality gate previously compared residential recommendations in chapters
01, 09, 12 and the summary, but omitted an explicit recommendation for the
subject base in the chapter 08 market narrative. A narrative recommending
55–58 while the price table recommended 45 could therefore pass the conflict
check.

The gate now checks explicit subject-base residential recommendations in the
market summary and chapters 10–12. Competitor prices, asking prices, hypothetical
scenarios, prior recommendations and unresolved values are excluded. Narrative
ranges and a recommended point within them are compatible; disjoint values are
conflicts. Existing direct-field checks remain in place.

Declared area, zoning, village and school fields are compared across chapters.
Road names are compared only for the same explicit cardinal frontage; distinct
access roads in the traffic narrative are not automatically contradictions.
This is a consistency check, not proof that the declared facts are correct.

The existing submission and client export gates already consume these conflicts.
The change does not introduce database writes, bypass incomplete evidence,
alter historical records, or infer missing prices.

Validation: npm test includes tests/report-consistency.mjs with positive and
negative recommendation, rounding, unit conversion, unresolved-field and
road-scope cases. Two historical QA inputs were checked locally: the inherited
area contradiction remains detected, and the previously missed market/table
price contradiction is now detected. Private uploaded fixtures are not committed.

Outstanding factual acceptance requires parcel-specific zoning, neighborhood
school assignment, exact road conditions, release-aware full transaction checks
and substantive environmental evidence. A passing test suite does not certify
those research facts or the currently deployed production version.
