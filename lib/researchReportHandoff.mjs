function compactEvidence(field) {
  return {
    raw_value: field?.raw_value ?? null,
    normalized_value: field?.normalized_value ?? null,
    unit: field?.unit ?? null,
    status: field?.status ?? 'needs_manual_review',
    source_type: field?.source_type ?? null,
    source_url: field?.source_url ?? null,
    source_published_at: field?.source_published_at ?? null,
    evidence: field?.evidence ?? null,
    conflicts: field?.conflicts ?? [],
  };
}

export function buildResearchReportHandoff(researchPackage) {
  const qualityGate = researchPackage?.quality_gate || {};
  const eligible = qualityGate.allow_formal_report === true;

  if (!eligible) {
    return {
      eligible: false,
      text: '',
      blockers: qualityGate.blocking_reasons || ['研究包未取得正式報告資格。'],
    };
  }

  const fields = Object.fromEntries(
    Object.entries(researchPackage.fields || {}).map(([key, value]) => [key, compactEvidence(value)])
  );

  const handoff = {
    package_id: researchPackage.package_id,
    schema_version: researchPackage.schema_version,
    case: researchPackage.case,
    fields,
    boundaries: researchPackage.boundaries,
    ownership_and_adjacent: researchPackage.ownership_and_adjacent,
    life_circle: researchPackage.life_circle,
    competitors: researchPackage.competitors,
    pricing: researchPackage.pricing,
    quality_gate: qualityGate,
  };

  return {
    eligible: true,
    blockers: [],
    text: `以下為已通過正式報告資格的土地調研交接包。僅能依各欄位的 normalized_value、status 與 evidence 使用資料；status 為 conflict、needs_manual_review、unavailable 的欄位必須在報告中保留待人工複核，不得補猜或轉寫為已確認事實。不得加入交接包以外的數字、分區、道路、競案或價格。\n\n${JSON.stringify(handoff, null, 2)}`,
  };
}
