'use client';

const clean = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  if (value === undefined || value === null || value === '') return '待調研／待複核';
  return String(value);
};

const buildReportText = (report) => {
  const lots = report.basic_info.land_lots
    .map((lot, index) => `${index + 1}. ${clean(lot.full_text)}：${clean(lot.area_sqm)}㎡，約${clean(lot.area_ping)}坪。${clean(lot.note)}`)
    .join('\n');

  const directions = report.site_conditions.directions
    .map((item) => `${clean(item.direction)}：${clean(item.description)}`)
    .join('\n');

  const cases = report.market.cases
    .map((item, index) => `${index + 1}. ${clean(item.name)}\n類型：${clean(item.type)}\n區位／距離：${clean(item.area)}\n產品規劃：${clean(item.planning)}\n成交／價格資訊：${clean(item.price)}\n參考價值：${clean(item.reference)}\n銷售狀態／資料限制：${clean(item.status)}`)
    .join('\n\n');

  return `海悅廣告　土地評估分析表

配合業主：
${clean(report.basic_info.client)}

調研時間：
${clean(report.basic_info.research_date)}

標的位置：
${clean(report.basic_info.site_location)}

標的地號：
${clean(report.basic_info.land_lots_text)}

土地分區：
${clean(report.legal_volume.zoning)}

基地面積：
${lots}
合計：${clean(report.legal_volume.total_area_sqm)}㎡，約${clean(report.legal_volume.total_area_ping)}坪。

法定建蔽率：
${clean(report.legal_volume.coverage_ratio)}

法定容積率：
${clean(report.legal_volume.floor_area_ratio)}

臨路條件：
${clean(report.legal_volume.road_access)}

土地售價：
${clean(report.basic_info.land_price)}

學區：
國小：${clean(report.school_and_village.elementary_school)}
國中：${clean(report.school_and_village.junior_high_school)}

里別：
${clean(report.school_and_village.village)}

基地現況：
${directions}

交通動線：
${clean(report.environment.traffic)}

生活機能：
${clean(report.environment.living_functions)}

公共建設：
${clean(report.environment.public_facilities)}

區域銷況：
${clean(report.market.sales_status)}

建議產品：
${clean(report.product.suggestion)}

個案參考：
${cases}

價格預判：
${clean(report.pricing.prediction)}

綜合評估：
優勢一：${clean(report.evaluation.strengths[0])}
優勢二：${clean(report.evaluation.strengths[1])}
優勢三：${clean(report.evaluation.strengths[2])}

劣勢一：${clean(report.evaluation.weaknesses[0])}
劣勢二：${clean(report.evaluation.weaknesses[1])}
劣勢三：${clean(report.evaluation.weaknesses[2])}

初步結論：
${clean(report.evaluation.conclusion)}

資料來源：
${clean(report.sources.source_note)}

待複核事項：
${clean(report.sources.review_items)}
`;
};

export default function ReportPreview({ report }) {
  const reportText = buildReportText(report);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      alert('已複製完整土地評估報告文字。');
    } catch (error) {
      alert('複製失敗，請手動選取右側文字。');
    }
  };

  return (
    <section className="panel preview-panel">
      <div className="panel-header preview-header">
        <div>
          <p className="eyebrow small">Report Output</p>
          <h2>完整文字報告</h2>
          <p className="muted">可直接複製到 Excel 欄位、業主提報或內部報告。</p>
        </div>
        <button className="btn primary" onClick={copyText}>一鍵複製全文</button>
      </div>

      <article className="report-paper">
        <div className="report-brand-row">
          <div className="report-brand-lockup">
            <div className="report-brand-mark">H</div>
            <div>
              <div className="report-brand-title">HIYES</div>
              <div className="report-brand-subtitle">海悅廣告｜土地評估工作台</div>
            </div>
          </div>
          <div className="report-brand-side">
            <span>土地開發初評</span>
            <span>Internal Use</span>
          </div>
        </div>
        <pre className="text-report">{reportText}</pre>
        <div className="report-credit">海悅機構｜海宇國際 戴異軒 製</div>
      </article>
    </section>
  );
}
