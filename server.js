'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path');
if(process.argv[2]==='--hash'){const s=crypto.randomBytes(16).toString('hex');console.log(s+':'+crypto.scryptSync(process.argv[3]||'',s,64).toString('hex'));process.exit()}
const express=require('express'),helmet=require('helmet'),rl=require('express-rate-limit');
const {SESSION_SECRET,ADMIN_USER='admin',ADMIN_PASS_HASH,DISCORD_WEBHOOK_URL,PORT=3000}=process.env;
if(!SESSION_SECRET||SESSION_SECRET.length<32||!ADMIN_PASS_HASH){console.error('Set SESSION_SECRET (32+ chars) and ADMIN_PASS_HASH in .env');process.exit(1)}
const DATA=path.join(__dirname,'data.json'),app=express();
app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'1mb'}));
const sign=v=>crypto.createHmac('sha256',SESSION_SECRET).update(v).digest('base64url');
const eq=(a,b)=>{a=Buffer.from(a);b=Buffer.from(b);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
function session(req){const m=/(?:^|; )glz=([^;]+)/.exec(req.headers.cookie||'');if(!m)return null;const[b,s]=m[1].split('.');if(!s||!eq(s,sign(b)))return null;try{const p=JSON.parse(Buffer.from(b,'base64url'));return p.exp>Date.now()?p:null}catch{return null}}
const auth=(req,res,next)=>{const s=session(req);if(!s)return res.status(401).json({error:'Not signed in.'});
 if(req.method!=='GET'&&(req.get('x-csrf')!==s.csrf||!req.get('content-type')?.includes('json')))return res.status(403).json({error:'CSRF check failed.'});req.s=s;next()};
app.post('/api/login',rl({windowMs:15*60e3,max:10}),(req,res)=>{const{user=ADMIN_USER,password}=req.body||{};const[salt,hash]=ADMIN_PASS_HASH.split(':');
 const h=crypto.scryptSync(String(password||''),salt,64).toString('hex');
 if(typeof user!=='string'||!eq(user,ADMIN_USER)||!eq(h,hash))return res.status(401).json({error:'Wrong username or password.'});
 const p={exp:Date.now()+8*3600e3,csrf:crypto.randomBytes(16).toString('hex')},b=Buffer.from(JSON.stringify(p)).toString('base64url');
 res.setHeader('Set-Cookie',`glz=${b}.${sign(b)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);res.json({csrf:p.csrf})});
app.post('/api/logout',(req,res)=>{res.setHeader('Set-Cookie','glz=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');res.json({ok:true})});
app.get('/api/me',auth,(req,res)=>res.json({csrf:req.s.csrf}));
app.get('/data.json',(req,res)=>fs.existsSync(DATA)?res.type('json').sendFile(DATA):res.json({events:[],news:[],site:null}));
app.put('/api/content',auth,rl({windowMs:60e3,max:30}),(req,res)=>{const d=req.body;
 if(!d||!Array.isArray(d.events)||!Array.isArray(d.news))return res.status(400).json({error:'Expected {events:[], news:[]}.'});
 if(fs.existsSync(DATA))fs.copyFileSync(DATA,DATA+'.bak');d.updated=new Date().toISOString();fs.writeFileSync(DATA,JSON.stringify(d,null,1));res.json({ok:true,updated:d.updated})});
app.post('/api/upload',auth,rl({windowMs:60e3,max:40}),(req,res)=>{const{path:p,b64}=req.body||{};
 if(typeof p!=='string'||!/^images\/uploads\/[a-z0-9._-]{1,80}\.webp$/.test(p)||typeof b64!=='string'||b64.length>2.8e6||!/^[A-Za-z0-9+/=]+$/.test(b64))return res.status(400).json({error:'Invalid image.'});
 const f=path.join(__dirname,'..',p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.from(b64,'base64'));res.json({ok:true})});
app.post('/api/discord',auth,rl({windowMs:60e3,max:10}),async(req,res)=>{if(!DISCORD_WEBHOOK_URL)return res.status(501).json({error:'DISCORD_WEBHOOK_URL not configured.'});
 try{const r=await fetch(DISCORD_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req.body)});res.status(r.ok?200:502).json({ok:r.ok})}catch{res.status(502).json({error:'Discord unreachable.'})}});
app.use(express.static(path.join(__dirname,'..'),{index:'index.html',dotfiles:'deny'}));
app.listen(PORT,()=>console.log('GlazedSMP on :'+PORT));
