export const runtime = 'nodejs';

const today = new Date().toISOString().slice(0, 10);

const buildPrompt = ({ client, researchDate, landNumber, landPrice, specifiedCases }) => `
你是海悅廣告土地評估系統的專業代銷土地開發調研助手。

請依照固定「海悅廣告 土地評估分析表」邏輯，針對以下土地進行完整調研，並輸出可直接作為 PDF 報告正文的繁體中文內容。

【使用者輸入】
配合業主：${client || '待填寫'}
調研日期：${researchDate || today}
目標地號：${landNumber || '待填寫'}
土地售價：${landPrice || '未提供，請填待提供／待複核'}
指定競案：${specifiedCases || '未指定，請自主篩選基地周邊最近且具可比性的競案'}

【核心要求】
1. 不是只填空，也不是產生 JSON。
2. 請直接產出完整土地評估報告文字。
3. 每一欄都要盡量主動查找或推回明確答案，不要大量寫待複核。
4. 只有在公開資料不足、資料互相矛盾或需正式文件確認時，才標註待複核，且要說明原因。
5. 競案以基地周邊最近為優先；第一順位為線上預售案，盡量找滿4案；不足時補屋齡5年內、5至10年、10至15年指標案。
6. 基地四向現況需依實際地圖、衛星圖、街景、地籍圖或可得公開資料判讀；臨路需寫路名與路寬，臨房需寫建物型態與樓高。
7. 車位價格需以周邊競案車位行情為核心，公式推算只做合理性檢查。

【固定輸出格式】
請使用下列欄位順序，不要省略欄位：

海悅廣告　土地評估分析表

配合業主：

調研時間：

標的位置：

標的地號：

土地分區：

基地面積：

法定建蔽率：

法定容積率：

臨路條件：

土地售價：

學區：

里別：

基地現況：
東向：
南向：
西向：
北向：

交通動線：

生活機能：

公共建設：

區域銷況：

建議產品：

個案參考：
1.
2.
3.
4.

價格預判：

綜合評估：
優勢一：
優勢二：
優勢三：

劣勢一：
劣勢二：
劣勢三：

初步結論：

資料來源：

待複核事項：
`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { client, landNumber } = body;

    if (!client || !landNumber) {
      return Response.json({ error: '請填寫配合業主與目標地號。' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: '尚未設定 OPENAI_API_KEY。請先到 Vercel → Project Settings → Environment Variables 新增 OPENAI_API_KEY，然後重新部署。',
        },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: buildPrompt(body),
        tools: [{ type: 'web_search_preview' }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error?.message || 'OpenAI 調研 API 呼叫失敗。' },
        { status: response.status }
      );
    }

    const reportText = data.output_text || data.output?.map((item) => item.content?.map((c) => c.text).join('\n')).join('\n') || '';

    return Response.json({
      reportText,
      sources: [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message || '伺服器錯誤。' }, { status: 500 });
  }
}
