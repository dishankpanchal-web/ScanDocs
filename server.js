const http=require('http'),fs=require('fs'),path=require('path');
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/manifest+json','.png':'image/png'};
http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  const f=path.join(__dirname,path.normalize(p));
  if(!f.startsWith(__dirname)){r.writeHead(403);return r.end()}
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('Not found')}
    r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});r.end(d)});
}).listen(process.env.PORT||3000,'0.0.0.0');
