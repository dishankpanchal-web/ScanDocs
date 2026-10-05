const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/manifest+json','.png':'image/png'};
const PRIVATE=['server.js','package.json'];
let SA=null;try{SA=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT||'')}catch(e){}
const b64=b=>Buffer.from(b).toString('base64url');
let tok={v:null,exp:0};
async function token(){
  if(tok.v&&Date.now()<tok.exp)return tok.v;
  const n=Math.floor(Date.now()/1000);
  const h=b64(JSON.stringify({alg:'RS256',typ:'JWT'})),c=b64(JSON.stringify({iss:SA.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:n,exp:n+3600}));
  const s=crypto.createSign('RSA-SHA256').update(h+'.'+c).sign(SA.private_key,'base64url');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:h+'.'+c+'.'+s})});
  const j=await r.json();if(!j.access_token)throw new Error(j.error_description||'Google sign-in failed');
  tok={v:j.access_token,exp:Date.now()+3300e3};return tok.v;
}
async function g(url,opt={}){
  const r=await fetch(url,{...opt,headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'}});
  const j=await r.json();
  if(!r.ok)throw new Error(r.status===403?'No edit access. Share the sheet with '+SA.client_email+' as Editor.':r.status===404?'Sheet not found. Check the link.':(j.error&&j.error.message)||'Google error');
  return j;
}
async function append({sheetId,tab,rows}){
  if(!SA)throw new Error('Google Sheets is not set up on the server yet.');
  if(!sheetId||!/^[\w-]+$/.test(sheetId))throw new Error('That does not look like a Google Sheet link.');
  if(!Array.isArray(rows)||!rows.length)throw new Error('Nothing to send.');
  const base='https://sheets.googleapis.com/v4/spreadsheets/'+sheetId;
  if(!tab){const m=await g(base+'?fields=sheets.properties.title');tab=m.sheets[0].properties.title}
  rows=rows.map(r=>r.map(v=>String(v).slice(0,49000)));
  await g(base+'/values/'+encodeURIComponent("'"+tab.replace(/'/g,"''")+"'")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',body:JSON.stringify({values:rows})});
  return{added:rows.length,tab};
}
const json=(r,c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o))};
http.createServer(async(q,r)=>{
  const u=q.url.split('?')[0];
  if(u==='/api/config')return json(r,200,{enabled:!!SA,email:SA&&SA.client_email,defaultSheet:!!process.env.SHEET_ID});
  if(u==='/api/sheets'&&q.method==='POST'){
    let b='';for await(const c of q){b+=c;if(b.length>6e6)return json(r,413,{error:'Too much data'})}
    try{const d=JSON.parse(b);d.sheetId=d.sheetId||process.env.SHEET_ID;json(r,200,await append(d))}
    catch(e){json(r,400,{error:e.message})}return;
  }
  let p=decodeURIComponent(u);if(p.endsWith('/'))p+='index.html';
  const f=path.join(__dirname,path.normalize(p));
  if(!f.startsWith(__dirname)||PRIVATE.includes(path.basename(f))||!T[path.extname(f)]){r.writeHead(404);return r.end('Not found')}
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('Not found')}r.writeHead(200,{'Content-Type':T[path.extname(f)]});r.end(d)});
}).listen(process.env.PORT||3000,'0.0.0.0');
