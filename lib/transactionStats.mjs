// Input rows are normalized records, never raw scraped text. Missing identity,
// status or subject is a blocker, rather than silently becoming a valid sale.
export function summarizeTransactions({ projectId, rows, startMonth, endMonth }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(endMonth) || startMonth > endMonth) throw Error('Invalid month range');
  if (!projectId || !Array.isArray(rows)) throw Error('Project identity and transaction rows are required');
  const months = {};
  for (let date = new Date(`${startMonth}-01T00:00:00Z`); date.toISOString().slice(0,7) <= endMonth; date.setUTCMonth(date.getUTCMonth()+1)) {
    months[date.toISOString().slice(0,7)] = 0;
    if (Object.keys(months).length > 240) throw Error('Month range is too large');
  }
  const blocked = [], excluded = [], latest = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { blocked.push({ reason: 'invalid_record' }); continue; }
    if (row.projectId !== projectId) { blocked.push({ id: row.recordId, reason: 'project_mismatch' }); continue; }
    if (!row.recordId || !row.unitId || !['valid','cancelled','superseded'].includes(row.status)) { blocked.push({ id: row.recordId, reason: 'missing_identity_or_status' }); continue; }
    const version = Date.parse(row.updatedAt);
    if (!Number.isFinite(version)) { blocked.push({ id: row.recordId, reason: 'invalid_version_timestamp' }); continue; }
    const old = latest.get(row.recordId);
    if (old && Date.parse(old.updatedAt) === version && JSON.stringify(old) !== JSON.stringify(row)) { blocked.push({ id: row.recordId, reason: 'conflicting_record_version' }); continue; }
    if (!old || Date.parse(old.updatedAt) < version) latest.set(row.recordId, row);
  }
  const effective = new Map();
  for (const row of latest.values()) {
    if (row.status !== 'valid') { excluded.push({ id: row.recordId, reason: row.status }); continue; }
    const parsedDate = new Date(row.transactionDate);
    if (!['presale','first_sale','resale'].includes(row.kind) || !/^\d{4}-\d{2}-\d{2}$/.test(row.transactionDate) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== row.transactionDate) { blocked.push({ id: row.recordId, reason: 'invalid_transaction_scope' }); continue; }
    if (row.transactionDate.slice(0,7) < startMonth || row.transactionDate.slice(0,7) > endMonth) { excluded.push({ id: row.recordId, reason: 'outside_period' }); continue; }
    // Linking a delivery transfer to its original presale is required before
    // combining phases. Resales are not developer sell-through.
    if (row.kind === 'resale' || row.originalPresaleId) { excluded.push({ id: row.recordId, reason: row.kind === 'resale' ? 'resale' : 'delivery_of_presale' }); continue; }
    if (effective.has(row.unitId)) { blocked.push({ id: row.recordId, reason: 'multiple_sales_for_unit_requires_review' }); continue; }
    effective.set(row.unitId, row);
  }
  const prices = [];
  for (const row of effective.values()) {
    months[row.transactionDate.slice(0,7)]++;
    if (!['residential','store','office','other'].includes(row.use) || (row.use === 'residential' && !Number.isFinite(row.floor))) { blocked.push({ id: row.recordId, reason: 'missing_use_or_floor' }); continue; }
    if (row.use !== 'residential' || row.floor < 2 || row.specialTransaction === true) { excluded.push({ id: row.recordId, reason: 'excluded_from_residential_price' }); continue; }
    if (row.specialTransaction !== false || !Number.isFinite(row.totalPrice) || row.totalPrice <= 0 || !Number.isFinite(row.areaSqm) || row.areaSqm <= 0 || !Number.isFinite(row.parkingPrice) || row.parkingPrice < 0 || !Number.isFinite(row.parkingAreaSqm) || row.parkingAreaSqm < 0) { blocked.push({ id: row.recordId, reason: 'price_components_unverified' }); continue; }
    const area = row.areaSqm - row.parkingAreaSqm, price = row.totalPrice - row.parkingPrice;
    if (area <= 0 || price <= 0) { blocked.push({ id: row.recordId, reason: 'invalid_net_price_or_area' }); continue; }
    prices.push({ id: row.recordId, priceWanPerPing: price / (area / 3.305785) / 10000 });
  }
  const valid = blocked.length === 0;
  // Correct arithmetic is not source verification. An internal reviewer must
  // inspect original records and comparability before formal adoption.
  return { valid, blocked, excluded, period: { startMonth, endMonth }, effectiveSaleCount: effective.size, months, monthlyAverage: effective.size / Object.keys(months).length, residentialPrices: prices, priceSampleCountSufficient: valid && prices.length >= 3, allowFormalUse: false, allowFormalPriceUse: false, sourceVerified: false, requiresSourceReview: true, inventory: null };
}
