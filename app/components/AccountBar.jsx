'use client';
import {useEffect,useState} from 'react';
import '../management.css';
export default function AccountBar(){const [session,setSession]=useState(null);useEffect(()=>{fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.json()).then(setSession).catch(()=>{});},[]);async function logout(){await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});localStorage.removeItem('hiyes-land-evaluation-draft-v9-reading-mode');sessionStorage.clear();location.href='/login';}return <div className="account-bar"><a href="/cases">我的案件</a><a href="/admin">管理後台</a>{session?.authenticated?<><span>{session.member.email}</span><button onClick={logout}>登出</button></>:<a href="/login">登入</a>}</div>;}
