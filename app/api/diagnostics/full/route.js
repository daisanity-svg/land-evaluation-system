export const runtime = 'nodejs';

export async function GET() {
  return Response.json(
    {
      success: false,
      saved: false,
      verified: false,
      status: 'retired',
      error: 'This write-capable diagnostic endpoint has been disabled.',
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
