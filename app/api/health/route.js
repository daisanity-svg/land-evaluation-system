export const runtime = 'nodejs';

export async function GET() {
  const suppliedCommit = process.env.VERCEL_GIT_COMMIT_SHA || '';
  const commit = /^[a-f0-9]{40}$/i.test(suppliedCommit) ? suppliedCommit.toLowerCase() : null;
  return Response.json(
    {
      ok: true,
      status: 'healthy',
      service: 'land-evaluation-system',
      commit_sha: commit,
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
