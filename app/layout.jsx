import './globals.css';

export const metadata = {
  title: '海悅廣告｜土地評估系統',
  description: 'JSON 匯入、欄位編輯、一頁式土地評估報告與 PDF 列印',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
