export const DEFAULT_VALUE = '待調研／待複核';

const today = new Date().toISOString().slice(0, 10);

export const emptyDirection = (direction) => ({
  direction,
  description: '待依實際地圖、衛星圖、街景、地籍圖或業主提供圖資判讀。若公開資料可確認，應盡量填入明確路名、路寬、臨房型態與樓高，不宜只寫待複核。',
});

export const emptyCase = (index = 1) => ({
  name: `競案${index}`,
  type: '線上預售案／新成屋／中古指標社區，依實際調研填寫',
  area: '待填寫距離、區位與生活圈',
  planning: '待填寫房型、坪數、戶數、樓層與產品定位',
  price: '待填寫近半年成交均價；若樣本不足，改查近一年並註明',
  reference: '待判斷本案參考價值，例如價格上緣、順銷參考、產品參考或中古替代品參考',
  status: '待填寫銷售狀態、成交筆數、資料限制與特殊排除說明',
});

export const defaultReport = {
  project_meta: {
    report_title: '海悅廣告　土地評估分析表',
    version: 'v2026-05-13-text-report-workbench',
  },
  basic_info: {
    client: '待填寫',
    research_date: today,
    site_location: '待依地號轉換為實際道路、街廓與生活圈描述。',
    land_lots_text: '待填寫完整地號，例如：桃園市中壢區中運段156、157、160地號。',
    land_lots: [
      { full_text: '待填寫地號', area_sqm: '待查詢', area_ping: '待換算', note: '平方公尺 × 0.3025 = 坪；應盡量逐筆查出實際面積。' },
    ],
    land_price: '使用者未提供時填寫「待提供／待複核」；若有地主開價則填入總價與單坪土地成本。',
  },
  legal_volume: {
    zoning: '待查都市計畫書、土地使用分區管制要點或分區證明；不得只依區域推估。',
    total_area_sqm: '待依逐筆地號加總',
    total_area_ping: '待依逐筆地號加總',
    coverage_ratio: '待依土地使用分區對應法定建蔽率填入明確數字。',
    floor_area_ratio: '待依土地使用分區對應法定容積率填入明確數字。',
    road_access: '待依實際地圖、地籍圖與街景判斷單面／雙面／三面／四面臨路，並寫明路名與路寬。',
  },
  school_and_village: {
    elementary_school: '待查教育局最新年度學區公告，若依里鄰不同分配需註明。',
    junior_high_school: '待查教育局最新年度學區公告，若依里鄰不同分配需註明。',
    village: '待透過地號位置、里界、戶政或區公所資料交叉判斷，應盡量填入最可能里別。',
  },
  site_conditions: {
    directions: ['東向', '南向', '西向', '北向'].map(emptyDirection),
  },
  environment: {
    traffic: '待整理國道、快速道路、捷運、公車、主要幹道與通勤動線，並說明對銷售客群的影響。',
    living_functions: '待整理主要依附商圈、採買、餐飲、市場、超市、生活成熟度與抗性。',
    public_facilities: '待整理學校、公園、政府機關、醫療、運動場、圖書館與重大建設。',
  },
  market: {
    sales_status: '待依基地周邊線上預售案與實價登錄整理區域銷況。預售案優先找滿4案，不足再補屋齡5年內、5至10年、10至15年指標案。',
    cases: [emptyCase(1), emptyCase(2), emptyCase(3), emptyCase(4)],
  },
  pricing: {
    prediction: '待依競案成交均價、區域新案成交帶、中古替代品、產品總價帶與基地條件，判斷建議表價、目標成交均價、首波成交帶與不建議主力成交帶。車位價格需以周邊競案車位行情為核心，公式推算僅作合理性檢查。',
  },
  product: {
    suggestion: '兩房：待回推建議坪數。\n三房：待回推建議坪數。\n四房：若區域與總價帶不適合，應明確列為不建議或低比例產品。',
  },
  evaluation: {
    strengths: ['待整理優勢一：需與區位、交通、生活機能、學區、價格或產品連動。', '待整理優勢二：需可直接作為業主提報語句。', '待整理優勢三：需具備銷售轉譯價值。'],
    weaknesses: ['待整理劣勢一：需說明市場或基地抗性。', '待整理劣勢二：需說明產品或價格風險。', '待整理劣勢三：需說明待補資料或競案壓力。'],
    conclusion: '待完成調研後給出初步結論與下一步待補資料。',
  },
  sources: {
    source_note: '資料來源應包含：業主資料、謄本／地籍圖、都市計畫書／分區證明、教育局學區公告、戶政／區公所里界、內政部實價登錄、實際地圖／衛星圖／街景、線上建案資訊。',
    review_items: '只有在公開資料不足、資料互相矛盾或需正式文件確認時，才標註待複核，且需說明原因。',
  },
};

export const cloneReport = () => structuredClone(defaultReport);
