export const runtime = 'nodejs';

export async function GET() {
  return Response.json(
    {
      ok: true,
      status: 'healthy',
      service: 'land-evaluation-system',
      timestamp: new Date().toISOString()
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}
