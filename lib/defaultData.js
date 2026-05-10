export const DEFAULT_VALUE = '待複核';

export const defaultReport = {
  project_meta: {
    report_title: '海悅廣告　土地評估分析表',
    version: '1.0.0',
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

export const ensureReport = (data) => deepMerge(defaultReport, data || {});
