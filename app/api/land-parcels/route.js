import { resolveLandParcels, ParcelError } from '../../../lib/landParcel.js';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request) {
  const body = await request.json().catch(()=>null);
  try { return Response.json(await resolveLandParcels(body?.land_number), {headers:{'Cache-Control':'no-store'}}); }
  catch (error) { return Response.json({error:error.code || 'parcel_lookup_failed', message:error instanceof ParcelError ? error.message : '地號查詢失敗，未採用推測位置。'}, {status:error instanceof ParcelError && error.code !== 'official_service_unavailable' ? 422 : 503}); }
}
