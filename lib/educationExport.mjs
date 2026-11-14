// Export only explicitly labelled case data. Never infer a school district
// from proximity, a competitor card, or a school named in transport prose.
const aliases={
 village:['里別','行政里','基地里別'],
 elementary:['基礎教育學區','國小學區','國民小學學區'],
 junior:['中等教育學區','國中學區','國民中學學區']
};
const groups=Object.entries(aliases).flatMap(([key,names])=>names.map(name=>[name,key]));
const names=groups.map(([name])=>name).join('|');
const patterns=new Map(groups);
function read(text){
 const result={};
 for(const raw of String(text||'').split('\n')){
  const line=raw.replace(/^\s*[-*]\s+/,'').replace(/\*\*/g,'').trim();
  const marks=[...line.matchAll(new RegExp('(?:^|[；;。｜|])[ \\t]*('+names+')[ \\t]*[：:｜|][ \\t]*','g'))];
  marks.forEach((m,i)=>{
   const value=line.slice(m.index+m[0].length,marks[i+1]?.index??line.length).trim();
   const key=patterns.get(m[1]);
   if(value&&!Object.hasOwn(result,key))result[key]=value;
  });
 }
 return result;
}
export function educationForExport(sections){
 const base=read(sections['06']),fallback=read(sections['01']);
 const pick=key=>base[key]||fallback[key]||'待複核';
 return {village:pick('village'),school:[...new Set([pick('elementary'),pick('junior')])].join('\n')};
}
