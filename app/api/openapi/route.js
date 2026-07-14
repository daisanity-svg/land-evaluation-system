export const runtime = 'nodejs';

const failureSchema = {
  type: 'object',
  required: ['success', 'saved', 'verified', 'status', 'report_id', 'request_id', 'error', 'detail'],
  properties: {
    success: { type: 'boolean', const: false },
    saved: { type: 'boolean', const: false },
    verified: { type: 'boolean', const: false },
    status: { type: 'string' },
    report_id: { type: 'string' },
    request_id: { type: 'string' },
    error: { type: 'string' },
    detail: { type: 'string' },
  },
};

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Hiyes Land Evaluation Submit API',
      version: '1.1.0',
      description: 'Submit and verify completed land evaluation reports.',
    },
    servers: [{ url: 'https://land-evaluation-system.vercel.app' }],
    paths: {
      '/api/reports': {
        post: {
          operationId: 'submitReport',
          summary: 'Submit and verify a land evaluation report',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: true,
                  required: ['report_id', 'client', 'land_number', 'research_date', 'summary', 'report_text'],
                  properties: {
                    report_id: { type: 'string' }, client: { type: 'string' },
                    land_number: { type: 'string' }, research_date: { type: 'string' },
                    summary: {
                      type: 'object', additionalProperties: true,
                      properties: {
                        location: { type: 'string' }, land_number: { type: 'string' }, zoning: { type: 'string' },
                        area: { type: 'string' }, road: { type: 'string' }, price: { type: 'string' },
                        product: { type: 'string' }, conclusion: { type: 'string' },
                      },
                    },
                    report_text: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Updated or existing report verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitSuccess' } } } },
            '201': { description: 'New report created and verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitSuccess' } } } },
            '400': { description: 'Missing or invalid required fields', content: { 'application/json': { schema: failureSchema } } },
            '401': { description: 'Supabase authentication failed', content: { 'application/json': { schema: failureSchema } } },
            '403': { description: 'Supabase authorization failed', content: { 'application/json': { schema: failureSchema } } },
            '500': { description: 'Server or environment configuration error', content: { 'application/json': { schema: failureSchema } } },
            '502': { description: 'Supabase write or verification error', content: { 'application/json': { schema: failureSchema } } },
          },
        },
      },
      '/api/reports/{reportId}/status': {
        get: {
          operationId: 'getReportStatus', summary: 'Safely check whether a report exists',
          parameters: [{ name: 'reportId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Safe report metadata without report text' }, '500': { description: 'Server error' }, '502': { description: 'Supabase query error' } },
        },
      },
    },
    components: {
      schemas: {
        SubmitSuccess: {
          type: 'object',
          required: ['success', 'saved', 'verified', 'operation', 'report_id', 'request_id', 'message'],
          properties: {
            success: { type: 'boolean', const: true }, saved: { type: 'boolean', const: true }, verified: { type: 'boolean', const: true },
            operation: { type: 'string', enum: ['created', 'updated', 'existing_verified'] },
            report_id: { type: 'string' }, request_id: { type: 'string' }, message: { type: 'string' },
          },
        },
      },
    },
  };
  return Response.json(spec, { headers: { 'Cache-Control': 'no-store' } });
}
