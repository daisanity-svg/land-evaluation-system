import './globals.css';
import './print-fix.css';
import './owner-briefing-final.css';
import './hiyes-cis-price-adjust.css';
import './pdf-render-final.css';
import './company-brand.css';

export const metadata = {
  title: '丸獸品牌整合行銷｜土地評估系統',
  description: '新版兩層架構：內部調研邏輯與業主版土地評估報告',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <script src="/report-print.js" defer></script>
        <script src="/pdf-render-cleanup.js" defer></script>
        <script src="/title-cleanup.js" defer></script>
      </body>
    </html>
  );
}

