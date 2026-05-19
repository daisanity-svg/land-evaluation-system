export const runtime = 'nodejs';

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Hiyes Land Evaluation Submit API',
      version: '1.0.0',
      description: 'Submit completed land evaluation report to Hiyes land evaluation system.'
    },
    servers: [{ url: 'https://land-evaluation-system.vercel.app' }],
    paths: {
      '/api/reports': {
        post: {
          operationId: 'submitReport',
          summary: 'Submit land evaluation report',
          description: 'Submit completed owner-facing land evaluation report.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: true,
                  required: ['report_id', 'client', 'land_number', 'research_date', 'summary', 'report_text'],
                  properties: {
                    report_id: { type: 'string' },
                    client: { type: 'string' },
                    land_number: { type: 'string' },
                    research_date: { type: 'string' },
                    summary: {
                      type: 'object',
                      additionalProperties: true,
                      properties: {
                        location: { type: 'string' },
                        land_number: { type: 'string' },
                        zoning: { type: 'string' },
                        area: { type: 'string' },
                        road: { type: 'string' },
                        price: { type: 'string' },
                        product: { type: 'string' },
                        conclusion: { type: 'string' }
                      }
                    },
                    report_text: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Submit result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: true,
                    properties: {
                      success: { type: 'boolean' },
                      ok: { type: 'boolean' },
                      saved: { type: 'boolean' },
                      status: { type: 'string' },
                      message: { type: 'string' },
                      report_id: { type: 'string' },
                      client: { type: 'string' },
                      land_number: { type: 'string' },
                      research_date: { type: 'string' },
                      saved_summary: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  return Response.json(spec, { headers: { 'Cache-Control': 'no-store' } });
}
