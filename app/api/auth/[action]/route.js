import {accessControlEnabled,accessError,AccessError,assertOrigin,service,rest,getMember,validEmail,sessionCookies,cookieToken,refreshToken,hashToken,verificationInput} from '../../../../lib/accessControl.mjs';
export const runtime='nodejs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request,{params}){try{const {action}=await params;if(action!=='session')return json({error:'Not found'},404);if(!cookieToken(request))return json({enabled:accessControlEnabled(),authenticated:false});const member=await getMember(request);return json({enabled:accessControlEnabled(),authenticated:true,member:{email:member.email,display_name:member.display_name,role:member.role,user_id:member.user_id}});}catch(e){return accessError(e);}}
export async function POST(request,{params}){try{assertOrigin(request);const {action}=await params;const body=await request.json().catch(()=>({}));
 if(action==='logout'){if(cookieToken(request))await service('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+cookieToken(request)}}).catch(()=>{});return sessionCookies(json({success:true}),null,request);}
 if(action==='refresh'){const token=refreshToken(request);if(!token)throw new AccessError('請重新登入。',401);const s=await service('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:token}});const probe=new Request(request.url,{headers:{cookie:'land_access='+encodeURIComponent(s.access_token)}});await getMember(probe);return sessionCookies(json({success:true}),s,request);}
 if(!['request','verify'].includes(action))return json({error:'Not found'},404);
 const email=validEmail(body.email);const members=await rest('land_members?email=eq.'+encodeURIComponent(email)+'&status=eq.active&select=email');
 const limit=await rest('rpc/land_rate_limit',{method:'POST',body:{p_bucket:hashToken(action+':'+email),p_max:action==='verify'?10:3}});if(!limit)throw new AccessError('操作次數過多，請稍後再試。',429);
 if(action==='request'){if(members?.length)await service('/auth/v1/otp',{method:'POST',body:{email,create_user:true}});return json({success:true,message:'若此Email已獲授權，將收到登入驗證碼。'});}
 if(!members?.length)throw new AccessError('登入驗證失敗。',401);const verification=verificationInput(body.code,email);
 const session=await service('/auth/v1/verify',{method:'POST',body:verification});if(!session?.access_token||!session?.refresh_token)throw new AccessError('驗證失敗，請重新索取驗證碼。',401);
 const member=await getMember(new Request(request.url,{headers:{cookie:'land_access='+encodeURIComponent(session.access_token)}}));if(member.email!==email)throw new AccessError('驗證信箱不一致，請使用自己的驗證信。',401);await rest('land_audit_log',{method:'POST',body:{actor_id:member.user_id,action:'login'}});
 return sessionCookies(json({success:true,role:member.role}),session,request);
 }catch(e){return accessError(e);}}
