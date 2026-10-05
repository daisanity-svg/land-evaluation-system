// Evidence metadata is an audit record, not proof that a source was fetched.
// Callers must retain source captures and review the actual quoted material.
export function assessFactEvidence(fact, now = new Date()) {
  const errors = [];
  const accepted = [];
  if (!fact || typeof fact !== 'object') return { status: 'blocked', errors: ['fact is required'] };
  if (!String(fact.subject || '').trim() || !String(fact.field || '').trim()) errors.push('subject and field are required');
  for (const source of fact.sources || []) {
    let url;
    try { url = new URL(source.url); } catch { errors.push('source URL is invalid'); continue; }
    if (!['https:', 'http:'].includes(url.protocol)) { errors.push('source URL must use HTTP'); continue; }
    if (!String(source.publisher || '').trim() || !String(source.origin || '').trim()) errors.push('publisher and original source origin are required');
    if (!String(source.excerpt || '').trim()) errors.push('source excerpt is required');
    const retrieved = Date.parse(source.retrieved_at);
    if (!Number.isFinite(retrieved) || retrieved > now.getTime()) errors.push('retrieval timestamp is invalid');
    if (source.subject !== fact.subject) errors.push('source subject does not match the fact');
    if (source.unit !== fact.unit) errors.push('source unit does not match the fact');
    if (source.period !== fact.period) errors.push('source period does not match the fact');
    if (source.value !== fact.value) errors.push('source value conflicts with the proposed fact');
    accepted.push(source);
  }
  if (!accepted.length) errors.push('no source evidence');
  const independentOrigins = new Set(accepted.map(s => String(s.origin || '').trim().toLowerCase()).filter(Boolean));
  if (!accepted.some(s => s.primary === true) && independentOrigins.size < 2) errors.push('a primary source or two independent original sources are required');
  return { status: errors.length ? 'blocked' : 'evidence_record_complete', errors, independent_sources: independentOrigins.size, requires_source_review: true };
}
