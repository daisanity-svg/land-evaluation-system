import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const target = new URL('../assets/NotoSansTC.ttf', import.meta.url);
const sha = 'ac091cc8cd19e848202afc8fe6d3809b4526c8fdbdb4be82da20c4f785949591';
const valid = bytes => createHash('sha256').update(bytes).digest('hex') === sha;
let cached; try { cached = await readFile(target); } catch {}
if (!cached || !valid(cached)) {
  const response = await fetch('https://raw.githubusercontent.com/notofonts/noto-cjk/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/Variable/TTF/Subset/NotoSansTC-VF.ttf', { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error('PDF font download failed: ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!valid(bytes)) throw Error('PDF font checksum mismatch');
  await mkdir(new URL('../assets/', import.meta.url), { recursive: true });
  await writeFile(target, bytes);
}
console.log('Pinned PDF font verified.');
