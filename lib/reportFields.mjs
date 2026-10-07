// Read a labelled field without crossing another field or chapter.
export function fieldBlock(text, keys) {
  const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
  for(const key of Array.isArray(keys)?keys:[keys]) {
    const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const index=lines.findIndex(l=>new RegExp('^[ \\t]*'+escaped+'[ \\t]*[：:]').test(l));
    if(index<0)continue;
    const values=[lines[index].replace(new RegExp('^[ \\t]*'+escaped+'[ \\t]*[：:][ \\t]*'),'')];
    for(let i=index+1;i<lines.length;i++) {
      if(/^[ \t]*\d{2}[｜|]|^[ \t]*[^：:\n]{1,24}[：:]/.test(lines[i]))break;
      values.push(lines[i]);
    }
    const value=values.join('\n').trim();if(value)return value;
  }
  return '';
}
