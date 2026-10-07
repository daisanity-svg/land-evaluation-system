import { assessReportQuality } from '../../../lib/reportQuality.mjs';
import { resolveLandParcels } from '../../../lib/landParcel.js';
import { auditResearchEvidence } from '../../../lib/researchEvidence.mjs';
import { POST as submitReport } from '../reports/route.js';

import { verifySourcePages } from '../../../lib/sourceVerifier.mjs';
export const runtime = 'nodejs';
export const maxDuration=60;

const headers = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
};

function respond(payload, status = 200) {
  return Response.json(payload, { status, headers });
}

function rpc(id, result) {
  return respond({ jsonrpc: '2.0', id: id ?? null, result });
}

function rpcError(id, code, message) {
  return respond({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, 400);
}

const submitTool = {
  name: 'submitReport',
  description: '儲存土地評估正式業主版報告，並驗證已成功寫入系統。僅在 report_text 已從 01｜案件摘要 至 12｜結論完整完成後呼叫一次。套版欄位為強制驗收：每一章的固定欄名均不可省略；無法確認的內容請填「待複核」。若回傳 template_incomplete，必須依缺漏清單補齊後重新呼叫本工具，成功前不得宣稱已送回系統。',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['report_id', 'client', 'land_number', 'research_date', 'summary', 'report_text'],
    properties: {
      report_id: { type: 'string' },
      client: { type: 'string' },
      land_number: { type: 'string' },
      research_date: { type: 'string' },
      summary: {
        type: 'object',
        additionalProperties: false,
        required: ['location', 'land_number', 'zoning', 'area', 'road', 'price', 'product', 'conclusion'],
        properties: {
          location: { type: 'string' }, land_number: { type: 'string' }, zoning: { type: 'string' }, area: { type: 'string' },
          road: { type: 'string' }, price: { type: 'string' }, product: { type: 'string' }, conclusion: { type: 'string' },
        },
      },
      report_text: { type: 'string' },
      research_evidence: { type: 'object', description: '內部核實紀錄：version=1、land_number、research_date、claims、transactions、market_scope。依getResearchInstructions完整格式填寫。' },
    },
  },
};

const parcelTool={name:'lookupLandParcels',description:'唯讀核對官方地段代碼並標準化地號；不確認宗地存在或幾何。',annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},inputSchema:{type:'object',required:['land_number'],additionalProperties:false,properties:{land_number:{type:'string'}}}};
const verifyTool={name:'verifyResearch',description:'唯讀查閱允許的公開原文並核對摘錄、標的與採用值，逐案成交驗算；不寫入資料庫，不代替法定文件與專業審閱。',annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},inputSchema:{type:'object',required:['research_evidence'],additionalProperties:false,properties:{research_evidence:{type:'object'},report_text:{type:'string'},land_number:{type:'string'},research_date:{type:'string'}}}};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET() {
  return respond({ name: 'Hiyes Land Evaluation MCP', transport: 'streamable-http', tools: [submitTool.name,verifyTool.name,parcelTool.name] });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || body.jsonrpc !== '2.0' || !body.method) return rpcError(body?.id, -32600, 'Invalid JSON-RPC request.');
  if (body.method === 'notifications/initialized') return new Response(null, { status: 202, headers });
  if (body.method === 'initialize') {
    return rpc(body.id, {
      protocolVersion: body.params?.protocolVersion || '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'hiyes-land-evaluation', version: '1.0.0' },
    });
  }
  if (body.method === 'tools/list') return rpc(body.id, { tools: [submitTool,verifyTool,parcelTool] });
  if (body.method !== 'tools/call') return rpcError(body.id, -32601, 'Method not found.');
  if(body.params?.name===parcelTool.name){try{const payload=await resolveLandParcels(body.params.arguments?.land_number);return rpc(body.id,{content:[{type:'text',text:JSON.stringify(payload)}],structuredContent:payload,isError:false});}catch(error){const payload={success:false,error:error.code||'lookup_failed',message:error.message};return rpc(body.id,{content:[{type:'text',text:JSON.stringify(payload)}],structuredContent:payload,isError:true});}}
  if(body.params?.name===verifyTool.name){const args=body.params.arguments||{};const sourceChecks=await verifySourcePages(args.research_evidence);const audit=auditResearchEvidence(args.research_evidence,args,{sourceChecks});if(args.report_text)audit.report_quality=assessReportQuality(args,{sourceChecks});return rpc(body.id,{content:[{type:'text',text:JSON.stringify(audit)}],structuredContent:audit,isError:!audit.present||audit.errors.length>0});}
  if (body.params?.name !== submitTool.name) return rpcError(body.id, -32602, 'Unknown tool.');

  const requestUrl = new URL('/api/reports', request.url);
  const upstream = await submitReport(new Request(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body.params?.arguments || {}),
  }));
  const payload = await upstream.json().catch(() => ({ success: false, error: 'invalid_submit_response' }));
  return rpc(body.id, {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: !payload.success,
  });
}

