import assert from 'node:assert/strict';
import {GET} from '../app/api/health/route.js';

const original=process.env.VERCEL_GIT_COMMIT_SHA;
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('Health check must not contact upstream services');};
try {
  for(const value of [undefined,'not-a-commit','abc123']) {
    if(value===undefined)delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA=value;
    const response=await GET(),body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.status,'healthy');
    assert.equal(body.commit_sha,null);
    assert.equal(response.headers.get('cache-control'),'no-store');
  }
  const sha='abcdef0123456789abcdef0123456789abcdef01';
  process.env.VERCEL_GIT_COMMIT_SHA=sha.toUpperCase();
  const body=await (await GET()).json();
  assert.equal(body.commit_sha,sha);
  assert.deepEqual(Object.keys(body).sort(),['commit_sha','ok','service','status','timestamp'].sort());
} finally {
  if(original===undefined)delete process.env.VERCEL_GIT_COMMIT_SHA;
  else process.env.VERCEL_GIT_COMMIT_SHA=original;
  globalThis.fetch=originalFetch;
}
console.log('Health remains available without metadata, exposes only a validated deployment SHA, and makes no upstream requests.');
