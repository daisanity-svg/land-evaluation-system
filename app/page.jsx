'use client';

import { useState } from 'react';
import JsonForm from '../components/JsonForm';
import ReportPreview from '../components/ReportPreview';
import { defaultReport } from '../lib/defaultData';

const fileName = (report) => {
  const client = report.basic_info.client || '土地評估';
  const firstLot = report.basic_info.land_lots?.[0];
  const section = firstLot?.section || '地段';
  const lot = firstLot?.lot_number || '地號';
  const count = report.basic_info.land_lots?.length > 1 ? `共${report.basic_info.land_lots.length}筆` : '';
  const date = report.basic_info.research_date || new Date().toISOString().slice(0, 10);
  return `${client}_${section}${lot}地號${count}_${date}.pdf`;
};

export default function Page() {
  const [report, setReport] = useState(defaultReport);

  const printPdf = () => {
    document.title = fileName(report).replace('.pdf', '');
    window.print();
  };

  const loadSample = async () => {
    try {
      const res = await fetch('/land-evaluation-system/sample_input.json').catch(() => fetch('/sample_input.json'));
      const data = await res.json();
      setReport(data);
    } catch (e) {
      alert('讀取 sample_input.json 失敗，請改用 JSON 匯入。');
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">海悅廣告｜土地評估系統</h1>
          <p className="app-subtitle">JSON 匯入、欄位編輯、一頁式土地評估報告與 PDF 輸出</p>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={loadSample}>載入範例 JSON</button>
          <button className="btn primary" onClick={printPdf}>列印 / PDF</button>
        </div>
      </header>
      <section className="grid">
        <JsonForm report={report} setReport={setReport} />
        <ReportPreview report={report} />
      </section>
    </main>
  );
}
