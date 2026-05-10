'use client';

function setAtPath(obj,path,value){
  if(!path.length) return value;
  const [h,...t]=path;
  const clone=Array.isArray(obj)?[...obj]:{...obj};
  clone[h]=setAtPath(clone[h],t,value);
  return clone;
}

function Node({value,path,onChange}){
  if(typeof value==='string' || typeof value==='number') return <input value={String(value)} onChange={e=>onChange(path,e.target.value)} />;
  if(Array.isArray(value)){
    return <div style={{borderLeft:'2px solid #cbd5e1',paddingLeft:8}}>
      {value.map((v,i)=><div key={i} style={{border:'1px solid #cbd5e1',padding:8,marginBottom:8,borderRadius:4}}><Node value={v} path={[...path,i]} onChange={onChange}/><button onClick={()=>onChange(path,value.filter((_,idx)=>idx!==i))}>刪除</button></div>)}
      <button onClick={()=>onChange(path,[...value, typeof value[0]==='object'? structuredClone(value[0]):'待複核'])}>新增</button>
    </div>
  }
  if(typeof value==='object' && value){
    return <div>{Object.entries(value).map(([k,v])=><div key={k}><label style={{fontWeight:'bold',fontSize:12}}>{k}</label><Node value={v} path={[...path,k]} onChange={onChange}/></div>)}</div>
  }
  return null;
}

export default function JsonForm({data,setData}){
  const onChange=(p,v)=>setData(prev=>setAtPath(prev,p,v));
  return <Node value={data} path={[]} onChange={onChange}/>;
}
