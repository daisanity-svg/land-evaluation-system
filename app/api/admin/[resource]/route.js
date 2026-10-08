import {requireAdmin,assertOrigin,accessError,AccessError,rest,validEmail,validId,accessControlEnabled} from '../../../../lib/accessControl.mjs';
export const runtime='nodejs';
const json=x=>Response.json(x,{headers:{'Cache-Control':'no-store'}});
export async function GET(request,{params}){try{await requireAdmin(request);const {resource}=await params;
 if(resource==='users')return json({users:await rest('land_members?select=email,user_id,display_name,role,status,mcp_status,created_at&order=created_at.desc&limit=500')});
 if(resource==='cases')return json({cases:await rest('land_cases?select=*&order=updated_at.desc&limit=500'),shares:await rest('land_case_shares?select=*&limit=2000')});
 if(resource==='audit')return json({events:await rest('land_audit_log?select=*&order=id.desc&limit=200')});
 if(resource==='settings')return json({access_enabled:accessControlEnabled(),admin_email:'daisanity@icloud.com',mcp_note:'連線狀態為管理員人工紀錄；不會自動授予或撤銷ChatGPT外掛權限。'});
 throw new AccessError('找不到功能。',404);
 }catch(e){return accessError(e);}}
export async function POST(request,{params}){try{assertOrigin(request);const actor=await requireAdmin(request);const {resource}=await params;const body=await request.json();
 if(resource==='users'){const email=validEmail(body.email);const role=body.role||'member',status=body.status||'active',mcp=body.mcp_status||'not_connected';if(!['admin','member'].includes(role)||!['active','disabled'].includes(status)||!['not_connected','confirmed','revoked'].includes(mcp))throw new AccessError('權限設定不正確。',400);
 await rest('rpc/land_admin_member',{method:'POST',body:{p_actor:actor.user_id,p_email:email,p_name:String(body.display_name||'').slice(0,100),p_role:role,p_status:status,p_mcp:mcp}});return json({success:true});}
 if(resource==='case-access'){const report=validId(body.report_id);const mode=body.mode;if(!['assign','share','revoke','archive','restore'].includes(mode))throw new AccessError('操作不正確。',400);let target=null;if(['assign','share','revoke'].includes(mode)){const rows=await rest('land_members?email=eq.'+encodeURIComponent(validEmail(body.email))+'&status=eq.active&select=user_id');target=rows?.[0]?.user_id;if(!target)throw new AccessError('請先讓這位使用者完成首次登入。',409);}const permission=body.permission||'view';if(!['view','edit'].includes(permission))throw new AccessError('權限不正確。',400);await rest('rpc/land_admin_case',{method:'POST',body:{p_actor:actor.user_id,p_report:report,p_mode:mode,p_target:target,p_permission:permission}});return json({success:true});}
 throw new AccessError('找不到功能。',404);
 }catch(e){return accessError(e);}}
