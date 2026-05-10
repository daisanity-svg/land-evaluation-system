# 海悅廣告｜土地評估系統（GitHub 上線版）

你說的流程「上傳到 GitHub，點網址即可用」，這版已經幫你配好。  
專案是靜態網頁（`index.html` + `sample_input.json`），可直接部署到 **GitHub Pages**。

---

## 一鍵上線（GitHub Pages）

1. 建立 GitHub Repo 並 push 本專案。
2. 到 GitHub Repo → **Settings** → **Pages**。
3. Source 選 **GitHub Actions**。
4. push 後會自動跑 `Deploy static app to GitHub Pages` workflow。
5. 完成後網址會是：
   `https://<你的帳號>.github.io/<repo-name>/`

> 已內建工作流程：`.github/workflows/deploy-pages.yml`

---

## 本機先測試

```bash
./run_web_app.sh 8080
```

開啟：`http://localhost:8080`

---

## 使用方式

1. 左側貼上 JSON（可直接貼 `sample_input.json`）
2. 點「驗證並套用」
3. 修改欄位
4. 點「更新預覽」
5. 點「匯出 JSON」下載
6. 點「下載 PDF（列印）」另存 PDF

---

## PDF 檔名規則

`建設公司名_第一筆地段地號(若多筆加共N筆)_調研日期.pdf`
