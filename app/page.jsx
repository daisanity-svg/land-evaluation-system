'use client';

import { useState } from 'react';
import JsonForm from '../components/JsonForm';
import ReportPreview from '../components/ReportPreview';
import { defaultReport } from '../lib/defaultData';

const pdfFileName = (report) => {
  const client = report.basic_info.client || '土地評估';
  const firstLot = report.basic_info.land_lots?.[0];
  const lotText = firstLot?.full_text || `${firstLot?.section || '地段'}${firstLot?.lot_number || '地號'}`;
  const count = report.basic_info.land_lots?.length > 1 ? `共${report.basic_info.land_lots.length}筆` : '';
  const date = report.basic_info.research_date || new Date().toISOString().slice(0, 10);
  return `${client}_${lotText}${count}_${date}`.replace(/[\\/:*?"<>|]/g, '-');
};

export default function Page() {
  const [report, setReport] = useState(defaultReport);

  const printPdf = () => {
    document.title = pdfFileName(report);
    window.print();
  };

  const resetReport = () => {
    const ok = window.confirm('確定要清空並回到空白土地評估模板？');
    if (ok) setReport(defaultReport);
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="eyebrow">Hiyes Advertising Land Intelligence</div>
        <div className="hero-content">
          <div>
            <h1 className="app-title">海悅廣告｜土地評估工作台</h1>
            <p className="app-subtitle">
              直接輸入地號與調研內容，產出可複製到 Excel／業主報告的完整文字版土地評估。已取消 JSON 轉換流程。
            </p>
          </div>
          <div className="toolbar hero-actions">
            <button className="btn ghost" onClick={resetReport}>清空模板</button>
            <button className="btn primary" onClick={printPdf}>列印 / PDF</button>
          </div>
        </div>
        <div className="status-row">
          <span>固定欄位完整保留</span>
          <span>資料盡量主動補齊</span>
          <span>文字版一鍵複製</span>
          <span>適合代銷提報</span>
        </div>
      </section>

      <section className="grid">
        <JsonForm report={report} setReport={setReport} />
        <ReportPreview report={report} />
      </section>
    </main>
  );
}
