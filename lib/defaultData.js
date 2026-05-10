import sample from '../sample_input.json';

export const DEFAULT_EMPTY = '待複核';

function fill(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_EMPTY;
  if (Array.isArray(value)) return value.length ? value.map(fill) : [DEFAULT_EMPTY];
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = fill(value[k]);
    return out;
  }
  return value;
}

export const baseData = fill(sample);

export function deepMergeWithDefault(input, defaults) {
  if (input === null || input === undefined || input === '') return defaults;
  if (Array.isArray(defaults)) {
    const arr = Array.isArray(input) ? input : defaults;
    return arr.map((v, i) => deepMergeWithDefault(v, defaults[Math.min(i, defaults.length - 1)]));
  }
  if (typeof defaults === 'object' && defaults !== null) {
    const out = {};
    for (const key of Object.keys(defaults)) out[key] = deepMergeWithDefault(input?.[key], defaults[key]);
    return out;
  }
  return input;
}

export function formatPdfFileName(data) {
  const client = data?.basic_info?.client || DEFAULT_EMPTY;
  const lots = data?.basic_info?.land_lots || [];
  const first = lots[0];
  const section = first ? `${first.section || ''}${first.lot_number || ''}地號` : DEFAULT_EMPTY;
  const lotText = lots.length > 1 ? `${section}共${lots.length}筆` : section;
  const date = data?.basic_info?.research_date || new Date().toISOString().slice(0,10);
  return `${client}_${lotText}_${date}.pdf`;
}
