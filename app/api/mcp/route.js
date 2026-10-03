import { POST as submitReport } from '../reports/route.js';

export const runtime = 'nodejs';

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
  description: '儲存土地評估正式業主版報告，並驗證已成功寫入系統。僅在 report_text 已從 01｜案件摘要 至 12｜結論完整完成後呼叫一次。',
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
    },
  },
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET() {
  return respond({ name: 'Hiyes Land Evaluation MCP', transport: 'streamable-http', tools: [submitTool.name] });
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
  if (body.method === 'tools/list') return rpc(body.id, { tools: [submitTool] });
  if (body.method !== 'tools/call') return rpcError(body.id, -32601, 'Method not found.');
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
