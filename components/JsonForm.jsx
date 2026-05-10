'use client';

import { useState } from 'react';
import { ensureReport } from '../lib/defaultData';

const setByPath = (obj, path, value) => {
  const copy = structuredClone(obj);
  let current = copy;
  path.slice(0, -1).forEach((key) => {
    current = current[key];
  });
  current[path[path.length - 1]] = value;
  return copy;
};

const TextField = ({ label, value, onChange, rows = 1 }) => (
  <div className="field">
    <label>{label}</label>
    {rows > 1 ? <textarea value={value ?? ''} rows={rows} onChange={(e) => onChange(e.target.value)} /> : <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
  </div>
);

export default function JsonForm({ report, setReport }) {
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState('');
  const update = (path, value) => setReport((prev) => setByPath(prev, path, value));

  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setReport(ensureReport(parsed));
      setMessage('JSON 匯入成功');
    } catch (error) {
      setMessage(`JSON 格式錯誤：${error.message}`);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.basic_info.client || '土地評估'}_${report.basic_info.research_date || 'draft'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addComparable = () => {
    const cases = report.comparables.cases || [];
    update(['comparables', 'cases'], [...cases, { case_name: '新增競案', case_type: '待複核', distance: '待複核', life_circle: '待複核', product_plan: '待複核', transaction_period: '待複核', transaction_count: '待複核', average_price_per_ping: '待複核', parking_price: '待複核', reference_value: '待判斷', source: '待補', notes: '' }]);
  };

  return (
    <div className="panel editor-panel">
      <div className="panel-header"><h2>資料編輯 / JSON 匯入</h2><p className="muted">所有欄位皆可手動修改，空值請保留「待複核」。</p></div>
      <div className="panel-body">
        <details className="section" open>
          <summary>JSON 匯入 / 匯出</summary>
          <div className="section-content">
            <textarea className="json-box" placeholder="貼上 ChatGPT 產出的土地評估 JSON" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
            <div className="toolbar"><button className="btn primary" onClick={importJson}>匯入 JSON</button><button className="btn" onClick={exportJson}>下載目前 JSON</button></div>
            {message && <div className="chip">{message}</div>}
          </div>
        </details>

        <details className="section" open>
          <summary>基本資料</summary>
          <div className="section-content">
            <div className="row"><TextField label="配合業主" value={report.basic_info.client} onChange={(v) => update(['basic_info','client'], v)} /><TextField label="調研時間" value={report.basic_info.research_date} onChange={(v) => update(['basic_info','research_date'], v)} /></div>
            <TextField label="標的位置" value={report.basic_info.site_location} rows={2} onChange={(v) => update(['basic_info','site_location'], v)} />
            <TextField label="土地售價" value={report.basic_info.land_price} onChange={(v) => update(['basic_info','land_price'], v)} />
            <TextField label="備註" value={report.basic_info.notes} rows={2} onChange={(v) => update(['basic_info','notes'], v)} />
          </div>
        </details>

        <details className="section">
          <summary>法定量體</summary>
          <div className="section-content">
            <TextField label="土地分區" value={report.legal_volume.zoning} onChange={(v) => update(['legal_volume','zoning'], v)} />
            <div className="row"><TextField label="基地總面積（坪）" value={report.legal_volume.total_area_ping} onChange={(v) => update(['legal_volume','total_area_ping'], v)} /><TextField label="基地總面積（㎡）" value={report.legal_volume.total_area_sqm} onChange={(v) => update(['legal_volume','total_area_sqm'], v)} /></div>
            <div className="row"><TextField label="建蔽率" value={report.legal_volume.coverage_ratio} onChange={(v) => update(['legal_volume','coverage_ratio'], v)} /><TextField label="容積率" value={report.legal_volume.floor_area_ratio} onChange={(v) => update(['legal_volume','floor_area_ratio'], v)} /></div>
            <TextField label="臨路條件" value={report.legal_volume.road_access_description} rows={2} onChange={(v) => update(['legal_volume','road_access_description'], v)} />
          </div>
        </details>

        <details className="section">
          <summary>基地四向現況</summary>
          <div className="section-content">
            {report.site_conditions.directions.map((d, i) => <div className="array-item" key={i}>
              <div className="row"><TextField label="方位" value={d.direction} onChange={(v) => update(['site_conditions','directions',i,'direction'], v)} /><TextField label="現況類型" value={d.condition_type} onChange={(v) => update(['site_conditions','directions',i,'condition_type'], v)} /></div>
              <div className="row"><TextField label="路名" value={d.road_name} onChange={(v) => update(['site_conditions','directions',i,'road_name'], v)} /><TextField label="路寬" value={d.road_width} onChange={(v) => update(['site_conditions','directions',i,'road_width'], v)} /></div>
              <TextField label="現況描述" value={d.description} rows={2} onChange={(v) => update(['site_conditions','directions',i,'description'], v)} />
            </div>)}
          </div>
        </details>

        <details className="section">
          <summary>環境 / 學區 / 產品 / 價格</summary>
          <div className="section-content">
            <TextField label="交通動線" value={report.environment.traffic} rows={2} onChange={(v) => update(['environment','traffic'], v)} />
            <TextField label="生活機能" value={report.environment.living_functions} rows={2} onChange={(v) => update(['environment','living_functions'], v)} />
            <TextField label="公共建設" value={report.environment.public_facilities} rows={2} onChange={(v) => update(['environment','public_facilities'], v)} />
            <div className="row"><TextField label="里別" value={report.school_and_village.village} onChange={(v) => update(['school_and_village','village'], v)} /><TextField label="國小學區" value={report.school_and_village.elementary_school} onChange={(v) => update(['school_and_village','elementary_school'], v)} /></div>
            <TextField label="國中學區" value={report.school_and_village.junior_high_school} onChange={(v) => update(['school_and_village','junior_high_school'], v)} />
            <TextField label="價格預判" value={report.pricing_forecast.pricing_rationale} rows={3} onChange={(v) => update(['pricing_forecast','pricing_rationale'], v)} />
            <TextField label="建議產品理由" value={report.product_recommendation.planning_rationale} rows={3} onChange={(v) => update(['product_recommendation','planning_rationale'], v)} />
          </div>
        </details>

        <details className="section">
          <summary>競案分析</summary>
          <div className="section-content">
            <button className="btn" onClick={addComparable}>新增競案</button>
            {report.comparables.cases.map((c, i) => <div className="array-item" key={i}>
              <div className="row"><TextField label="案名" value={c.case_name} onChange={(v) => update(['comparables','cases',i,'case_name'], v)} /><TextField label="成交均價" value={c.average_price_per_ping} onChange={(v) => update(['comparables','cases',i,'average_price_per_ping'], v)} /></div>
              <TextField label="產品規劃" value={c.product_plan} rows={2} onChange={(v) => update(['comparables','cases',i,'product_plan'], v)} />
              <TextField label="參考價值" value={c.reference_value} rows={2} onChange={(v) => update(['comparables','cases',i,'reference_value'], v)} />
            </div>)}
          </div>
        </details>
      </div>
    </div>
  );
}
