export const DEFAULT_VALUE = '待複核';

export const defaultReport = {
  project_meta: {
    report_title: '海悅廣告　土地評估分析表',
    version: 'v2026-05-10-json-mapping-fix',
    created_at: new Date().toISOString().slice(0, 10),
    output_filename_rule: '建設公司名＋地段地號＋調研日期.pdf',
  },
  basic_info: {
    client: '待複核',
    research_date: new Date().toISOString().slice(0, 10),
    site_location: '待複核',
    land_lots: [{ city: '待複核', district: '待複核', section: '待複核', subsection: '', lot_number: '待複核', note: '待複核' }],
    land_price: '待複核',
    research_status: '初步調研',
    notes: '待複核',
  },
  legal_volume: {
    zoning: '待複核', zoning_basis: '需以都市計畫書／分區證明複核',
    land_area_details: [{ lot_number: '待複核', area_sqm: '待複核', area_ping: '待複核', calculation: '平方公尺 × 0.3025 = 坪', verification_status: '待複核' }],
    total_area_sqm: '待複核', total_area_ping: '待複核', coverage_ratio: '待複核', floor_area_ratio: '待複核',
    buildable_area_sqm: '待複核', legal_floor_area_sqm: '待複核', road_access_type: '待複核', road_access_description: '待複核',
  },
  site_conditions: {
    orientation_logic: '優先使用東、南、西、北；若基地明顯偏斜才改用東北、西北、西南、東南。',
    directions: ['東向','南向','西向','北向'].map(direction => ({ direction, condition_type: '待複核', road_name: '待複核', road_width: '待複核', adjacent_building_type: '待複核', adjacent_floors: '待複核', description: '待依實際地圖、衛星圖、街景或使用者圖資判讀', sales_impact: '待評估', verification_status: '待複核' })),
  },
  environment: { traffic: '待調研', living_functions: '待調研', public_facilities: '待調研', life_circle_positioning: '待調研', sales_positioning_impact: '待評估' },
  school_and_village: { village: '待複核', elementary_school: '待複核', junior_high_school: '待複核', school_note: '需依教育局最新年度學區公告與里鄰資料複核', verification_note: '待複核' },
  comparables: { selection_logic: '以基地周遭最近、同生活圈、客戶會比較之線上預售案優先，盡量找滿4案；不足補中古案。', cases: [{ case_name: '競案A', case_type: '待複核', distance: '待複核', life_circle: '待複核', product_plan: '待複核', transaction_period: '近半年；若樣本不足改近一年', transaction_count: '待複核', average_price_per_ping: '待複核', parking_price: '待複核', reference_value: '待判斷', source: '待補', notes: '排除店面與特殊交易' }], market_limitations: '若實價揭露不足，需註明樣本限制' },
  pricing_forecast: { new_project_price_band: '待調研', resale_price_band: '待調研', price_ceiling: '待判斷', safe_sales_band: '待判斷', suggested_list_price: '待判斷', target_transaction_price: '待判斷', first_wave_transaction_band: '待判斷', premium_unit_price_space: '待判斷', not_recommended_main_price_band: '待判斷', parking_price_suggestion: '待依競案車位行情判斷', pricing_rationale: '以區域成交行情、競案價格、產品總價帶與基地條件綜合判斷' },
  product_recommendation: { two_bedroom: '待判斷', three_bedroom: '待判斷', four_bedroom: '待判斷', not_recommended_products: '待判斷', planning_rationale: '依基地條件、競案產品結構、區域客群與總價帶回推' },
  summary_evaluation: { strengths: ['待評估優勢1','待評估優勢2','待評估優勢3'], weaknesses: ['待評估劣勢1','待評估劣勢2','待評估劣勢3'], initial_conclusion: '待完成調研後判斷', next_steps: ['補正式謄本或地籍資料','補都市計畫分區資料','補實價登錄競案成交資料'] },
  sources_and_verification: { sources: ['業主提供資料','都市計畫書／分區資料','地籍圖／謄本','教育局學區公告','戶政／區公所里界資料','內政部實價登錄','實際地圖／衛星圖／街景'], items_to_verify: ['基地面積','土地使用分區','建蔽率與容積率','臨路條件與道路寬度','里別與學區','競案成交均價與車位價格'], risk_notes: ['所有未經正式文件確認之內容，報告需標註待複核。','競案成交樣本不足時，不可過度推論價格上緣。'] },
};

export function deepMerge(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (base && typeof base === 'object') {
    const result = { ...base };
    Object.keys(incoming || {}).forEach((key) => {
      result[key] = deepMerge(base[key], incoming[key]);
    });
    return result;
  }
  return incoming ?? base ?? DEFAULT_VALUE;
}

const hasFlatShape = (data = {}) => [
  'client', 'researchDate', 'location', 'landNumber', 'zoning', 'baseArea',
  'coverageRate', 'floorAreaRate', 'roadCondition', 'schoolDistrict', 'siteCondition',
  'traffic', 'livingFunction', 'publicConstruction', 'marketSummary', 'pricePrediction',
  'productSuggestion', 'cases', 'strengths', 'weaknesses', 'conclusion', 'sourceNote'
].some((key) => Object.prototype.hasOwnProperty.call(data, key));

const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== '') ?? DEFAULT_VALUE;

const parseLandLots = (landNumber = '') => {
  if (!landNumber || typeof landNumber !== 'string') return defaultReport.basic_info.land_lots;
  const text = landNumber.trim();
  const city = text.match(/([^縣市]+[縣市])/)?.[1] || '';
  const district = text.match(/([^縣市]+[區鄉鎮市])/)?.[1] || '';
  const section = text.match(/([^，,、\s]+段(?:[^，,、\s]*小段)?)/)?.[1] || '';
  const afterSection = section ? text.split(section).slice(1).join(section) : text;
  const lotText = afterSection.replace(/地號/g, '').replace(/共\d+筆/g, '').trim();
  const numbers = lotText.split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean);
  const lots = numbers.length ? numbers : [text.replace(/地號/g, '')];
  return lots.map((lot_number) => ({
    city: city || DEFAULT_VALUE,
    district: district || DEFAULT_VALUE,
    section: section || DEFAULT_VALUE,
    subsection: '',
    lot_number,
    note: text,
  }));
};

const parseSchool = (schoolDistrict = '') => {
  const text = String(schoolDistrict || DEFAULT_VALUE);
  const elementary = text.match(/國小[:：]?([^；;\n]+)/)?.[1]?.trim();
  const junior = text.match(/國中[:：]?([^；;\n]+)/)?.[1]?.trim();
  return { elementary: elementary || text, junior: junior || text, note: text };
};

const directionFromFlat = (label, value) => ({
  direction: label,
  condition_type: value ? '依匯入資料' : DEFAULT_VALUE,
  road_name: DEFAULT_VALUE,
  road_width: DEFAULT_VALUE,
  adjacent_building_type: DEFAULT_VALUE,
  adjacent_floors: DEFAULT_VALUE,
  description: pick(value),
  sales_impact: DEFAULT_VALUE,
  verification_status: value ? '依匯入資料初判' : DEFAULT_VALUE,
});

const normalizeComparable = (item = {}) => ({
  case_name: pick(item.name, item.case_name),
  case_type: pick(item.type, item.case_type),
  distance: pick(item.area, item.distance),
  life_circle: pick(item.area, item.life_circle),
  product_plan: pick(item.planning, item.product_plan),
  transaction_period: pick(item.status, item.transaction_period),
  transaction_count: pick(item.transaction_count),
  average_price_per_ping: pick(item.price, item.average_price_per_ping),
  parking_price: pick(item.parking_price),
  reference_value: pick(item.reference, item.reference_value),
  source: pick(item.source),
  notes: pick(item.status, item.notes),
});

const flatToNestedReport = (data = {}) => {
  const school = parseSchool(data.schoolDistrict);
  const sourceNote = data.sourceNote || {};
  const sourceValues = typeof sourceNote === 'object' && !Array.isArray(sourceNote)
    ? Object.values(sourceNote).filter(Boolean)
    : [sourceNote].filter(Boolean);

  return {
    project_meta: {
      report_title: pick(data.reportTitle, defaultReport.project_meta.report_title),
      version: 'v2026-05-10-json-mapping-fix',
      created_at: pick(data.researchDate, defaultReport.project_meta.created_at),
      output_filename_rule: defaultReport.project_meta.output_filename_rule,
    },
    basic_info: {
      client: pick(data.client, data.owner, data.cooperatingOwner),
      research_date: pick(data.researchDate),
      site_location: pick(data.location, data.targetLocation),
      land_lots: parseLandLots(pick(data.landNumber, data.targetParcel, data.targetParcelsText, '')),
      land_price: pick(data.landPrice),
      research_status: '初步調研',
      notes: pick(data.notes),
    },
    legal_volume: {
      zoning: pick(data.zoning),
      zoning_basis: pick(data.zoningBasis, '需以都市計畫書／分區證明複核'),
      land_area_details: [{
        lot_number: pick(data.landNumber, data.targetParcel, data.targetParcelsText),
        area_sqm: pick(data.baseAreaSqm),
        area_ping: pick(data.baseArea, data.siteArea),
        calculation: '平方公尺 × 0.3025 = 坪',
        verification_status: '依匯入資料初判／待複核',
      }],
      total_area_sqm: pick(data.baseAreaSqm, data.siteAreaSqm),
      total_area_ping: pick(data.baseArea, data.siteArea),
      coverage_ratio: pick(data.coverageRate, data.coverageRatio),
      floor_area_ratio: pick(data.floorAreaRate, data.floorAreaRatio),
      buildable_area_sqm: pick(data.buildableAreaSqm),
      legal_floor_area_sqm: pick(data.legalFloorAreaSqm),
      road_access_type: pick(data.roadAccessType),
      road_access_description: pick(data.roadCondition),
    },
    site_conditions: {
      orientation_logic: defaultReport.site_conditions.orientation_logic,
      directions: [
        directionFromFlat('東向', data.siteCondition?.east),
        directionFromFlat('南向', data.siteCondition?.south),
        directionFromFlat('西向', data.siteCondition?.west),
        directionFromFlat('北向', data.siteCondition?.north),
      ],
    },
    environment: {
      traffic: pick(data.traffic),
      living_functions: pick(data.livingFunction),
      public_facilities: pick(data.publicConstruction),
      life_circle_positioning: pick(data.lifeCirclePositioning),
      sales_positioning_impact: pick(data.salesPositioningImpact),
    },
    school_and_village: {
      village: pick(data.village),
      elementary_school: school.elementary,
      junior_high_school: school.junior,
      school_note: school.note,
      verification_note: '需依教育局最新年度學區公告與里鄰資料複核',
    },
    comparables: {
      selection_logic: defaultReport.comparables.selection_logic,
      cases: Array.isArray(data.cases) && data.cases.length ? data.cases.map(normalizeComparable) : defaultReport.comparables.cases,
      market_limitations: pick(data.marketSummary),
    },
    pricing_forecast: {
      new_project_price_band: pick(data.marketSummary),
      resale_price_band: DEFAULT_VALUE,
      price_ceiling: pick(data.priceCeiling),
      safe_sales_band: pick(data.safeSalesBand),
      suggested_list_price: pick(data.suggestedListPrice),
      target_transaction_price: pick(data.targetTransactionPrice, data.pricePrediction),
      first_wave_transaction_band: pick(data.firstWaveTransactionBand),
      premium_unit_price_space: pick(data.premiumUnitPriceSpace),
      not_recommended_main_price_band: pick(data.notSuggestedBand),
      parking_price_suggestion: pick(data.parkingPriceReference),
      pricing_rationale: pick(data.pricePrediction),
    },
    product_recommendation: {
      two_bedroom: pick(data.twoBedroom, data.productSuggestion),
      three_bedroom: pick(data.threeBedroom, data.productSuggestion),
      four_bedroom: pick(data.fourBedroom),
      not_recommended_products: pick(data.notSuggestedProducts),
      planning_rationale: pick(data.productSuggestion),
    },
    summary_evaluation: {
      strengths: Array.isArray(data.strengths) ? data.strengths : [pick(data.strengths)],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [pick(data.weaknesses)],
      initial_conclusion: pick(data.conclusion),
      next_steps: Array.isArray(data.nextSteps) ? data.nextSteps : defaultReport.summary_evaluation.next_steps,
    },
    sources_and_verification: {
      sources: sourceValues.length ? sourceValues : defaultReport.sources_and_verification.sources,
      items_to_verify: [pick(sourceNote.landLimit, data.itemsToReview)].filter(Boolean),
      risk_notes: [pick(data.riskNotes, '所有未經正式文件確認之內容，報告需標註待複核。')],
    },
  };
};

export const ensureReport = (data) => {
  const normalized = hasFlatShape(data) ? flatToNestedReport(data) : (data || {});
  return deepMerge(defaultReport, normalized);
};
