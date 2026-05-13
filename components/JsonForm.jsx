'use client';

import { emptyCase, emptyDirection } from '../lib/defaultData';

const updateAtPath = (source, path, value) => {
  const copy = structuredClone(source);
  let target = copy;
  path.slice(0, -1).forEach((key) => {
    target = target[key];
  });
  target[path[path.length - 1]] = value;
  return copy;
};

const Field = ({ label, value, onChange, rows = 1, placeholder = '' }) => (
  <label className="field">
    <span>{label}</span>
    {rows > 1 ? (
      <textarea value={value ?? ''} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    )}
  </label>
);

const Section = ({ title, hint, children, open = false }) => (
  <details className="section" open={open}>
    <summary>
      <strong>{title}</strong>
      {hint && <small>{hint}</small>}
    </summary>
    <div className="section-content">{children}</div>
  </details>
);

export default function JsonForm({ report, setReport }) {
  const update = (path, value) => setReport((prev) => updateAtPath(prev, path, value));

  const addLot = () => {
    const next = [...report.basic_info.land_lots, { full_text: '新增地號', area_sqm: '待查詢', area_ping: '待換算', note: '待補資料來源' }];
    update(['basic_info', 'land_lots'], next);
  };

  const removeLot = (index) => {
    const next = report.basic_info.land_lots.filter((_, i) => i !== index);
    update(['basic_info', 'land_lots'], next.length ? next : report.basic_info.land_lots);
  };

  const addCase = () => {
    const next = [...report.market.cases, emptyCase(report.market.cases.length + 1)];
    update(['market', 'cases'], next);
  };

  const removeCase = (index) => {
    const next = report.market.cases.filter((_, i) => i !== index);
    update(['market', 'cases'], next.length ? next : report.market.cases);
  };

  const addDirection = () => {
    update(['site_conditions', 'directions'], [...report.site_conditions.directions, emptyDirection('新增方位')]);
  };

  return (
    <aside className="panel editor-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow small">Input Console</p>
          <h2>土地資料編輯</h2>
        </div>
        <p className="muted">把 ChatGPT 查到的內容貼入各欄，右側會自動轉成完整文字報告。</p>
      </div>

      <div className="panel-body">
        <Section title="基本資料" hint="業主、日期、位置、地號、售價" open>
          <div className="row">
            <Field label="配合業主" value={report.basic_info.client} onChange={(v) => update(['basic_info', 'client'], v)} />
            <Field label="調研時間" value={report.basic_info.research_date} onChange={(v) => update(['basic_info', 'research_date'], v)} />
          </div>
          <Field label="標的位置" rows={3} value={report.basic_info.site_location} onChange={(v) => update(['basic_info', 'site_location'], v)} />
          <Field label="標的地號總述" rows={2} value={report.basic_info.land_lots_text} onChange={(v) => update(['basic_info', 'land_lots_text'], v)} />
          <Field label="土地售價" rows={2} value={report.basic_info.land_price} onChange={(v) => update(['basic_info', 'land_price'], v)} />

          <div className="subsection-title">逐筆地號與面積</div>
          {report.basic_info.land_lots.map((lot, index) => (
            <div className="array-item" key={index}>
              <div className="array-head">
                <strong>地號 {index + 1}</strong>
                <button className="text-btn" onClick={() => removeLot(index)}>移除</button>
              </div>
              <Field label="完整地號" value={lot.full_text} onChange={(v) => update(['basic_info', 'land_lots', index, 'full_text'], v)} />
              <div className="row">
                <Field label="面積（㎡）" value={lot.area_sqm} onChange={(v) => update(['basic_info', 'land_lots', index, 'area_sqm'], v)} />
                <Field label="面積（坪）" value={lot.area_ping} onChange={(v) => update(['basic_info', 'land_lots', index, 'area_ping'], v)} />
              </div>
              <Field label="備註／資料來源" rows={2} value={lot.note} onChange={(v) => update(['basic_info', 'land_lots', index, 'note'], v)} />
            </div>
          ))}
          <button className="btn ghost full" onClick={addLot}>＋ 新增地號</button>
        </Section>

        <Section title="法定量體" hint="分區、建蔽率、容積率、臨路">
          <Field label="土地分區" rows={3} value={report.legal_volume.zoning} onChange={(v) => update(['legal_volume', 'zoning'], v)} />
          <div className="row">
            <Field label="基地總面積（㎡）" value={report.legal_volume.total_area_sqm} onChange={(v) => update(['legal_volume', 'total_area_sqm'], v)} />
            <Field label="基地總面積（坪）" value={report.legal_volume.total_area_ping} onChange={(v) => update(['legal_volume', 'total_area_ping'], v)} />
          </div>
          <div className="row">
            <Field label="法定建蔽率" value={report.legal_volume.coverage_ratio} onChange={(v) => update(['legal_volume', 'coverage_ratio'], v)} />
            <Field label="法定容積率" value={report.legal_volume.floor_area_ratio} onChange={(v) => update(['legal_volume', 'floor_area_ratio'], v)} />
          </div>
          <Field label="臨路條件" rows={3} value={report.legal_volume.road_access} onChange={(v) => update(['legal_volume', 'road_access'], v)} />
        </Section>

        <Section title="學區與行政里別" hint="國小、國中、里別">
          <div className="row">
            <Field label="國小學區" value={report.school_and_village.elementary_school} onChange={(v) => update(['school_and_village', 'elementary_school'], v)} />
            <Field label="國中學區" value={report.school_and_village.junior_high_school} onChange={(v) => update(['school_and_village', 'junior_high_school'], v)} />
          </div>
          <Field label="里別" rows={2} value={report.school_and_village.village} onChange={(v) => update(['school_and_village', 'village'], v)} />
        </Section>

        <Section title="基地四向現況" hint="東南西北，依實際地圖判讀">
          {report.site_conditions.directions.map((item, index) => (
            <div className="array-item" key={index}>
              <div className="array-head">
                <strong>{item.direction}</strong>
              </div>
              <Field label="方位" value={item.direction} onChange={(v) => update(['site_conditions', 'directions', index, 'direction'], v)} />
              <Field label="現況描述" rows={4} value={item.description} onChange={(v) => update(['site_conditions', 'directions', index, 'description'], v)} />
            </div>
          ))}
          <button className="btn ghost full" onClick={addDirection}>＋ 新增方位</button>
        </Section>

        <Section title="環境與生活機能" hint="交通、機能、公設">
          <Field label="交通動線" rows={4} value={report.environment.traffic} onChange={(v) => update(['environment', 'traffic'], v)} />
          <Field label="生活機能" rows={4} value={report.environment.living_functions} onChange={(v) => update(['environment', 'living_functions'], v)} />
          <Field label="公共建設" rows={4} value={report.environment.public_facilities} onChange={(v) => update(['environment', 'public_facilities'], v)} />
        </Section>

        <Section title="區域銷況與競案" hint="預售案優先找滿4案">
          <Field label="區域銷況" rows={4} value={report.market.sales_status} onChange={(v) => update(['market', 'sales_status'], v)} />
          {report.market.cases.map((item, index) => (
            <div className="array-item" key={index}>
              <div className="array-head">
                <strong>個案參考 {index + 1}</strong>
                <button className="text-btn" onClick={() => removeCase(index)}>移除</button>
              </div>
              <div className="row">
                <Field label="案名" value={item.name} onChange={(v) => update(['market', 'cases', index, 'name'], v)} />
                <Field label="類型" value={item.type} onChange={(v) => update(['market', 'cases', index, 'type'], v)} />
              </div>
              <Field label="區位／距離／生活圈" rows={2} value={item.area} onChange={(v) => update(['market', 'cases', index, 'area'], v)} />
              <Field label="產品規劃" rows={3} value={item.planning} onChange={(v) => update(['market', 'cases', index, 'planning'], v)} />
              <Field label="成交／價格資訊" rows={3} value={item.price} onChange={(v) => update(['market', 'cases', index, 'price'], v)} />
              <Field label="對本案參考價值" rows={3} value={item.reference} onChange={(v) => update(['market', 'cases', index, 'reference'], v)} />
              <Field label="銷售狀態／資料限制" rows={2} value={item.status} onChange={(v) => update(['market', 'cases', index, 'status'], v)} />
            </div>
          ))}
          <button className="btn ghost full" onClick={addCase}>＋ 新增競案</button>
        </Section>

        <Section title="價格、產品與綜合評估" hint="成交帶、產品建議、3優3劣">
          <Field label="價格預判" rows={5} value={report.pricing.prediction} onChange={(v) => update(['pricing', 'prediction'], v)} />
          <Field label="建議產品" rows={5} value={report.product.suggestion} onChange={(v) => update(['product', 'suggestion'], v)} />
          <div className="subsection-title">3點優勢</div>
          {report.evaluation.strengths.map((text, index) => (
            <Field key={index} label={`優勢 ${index + 1}`} rows={2} value={text} onChange={(v) => update(['evaluation', 'strengths', index], v)} />
          ))}
          <div className="subsection-title">3點劣勢</div>
          {report.evaluation.weaknesses.map((text, index) => (
            <Field key={index} label={`劣勢 ${index + 1}`} rows={2} value={text} onChange={(v) => update(['evaluation', 'weaknesses', index], v)} />
          ))}
          <Field label="初步結論" rows={4} value={report.evaluation.conclusion} onChange={(v) => update(['evaluation', 'conclusion'], v)} />
        </Section>

        <Section title="資料來源與待複核事項" hint="只在必要時標待複核">
          <Field label="資料來源" rows={4} value={report.sources.source_note} onChange={(v) => update(['sources', 'source_note'], v)} />
          <Field label="待複核事項" rows={4} value={report.sources.review_items} onChange={(v) => update(['sources', 'review_items'], v)} />
        </Section>
      </div>
    </aside>
  );
}
