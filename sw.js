const C='docscan-v2';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||r.url.includes('/api/'))return;
e.respondWith(fetch(r).then(n=>{const k=n.clone();caches.open(C).then(c=>c.put(r,k));return n}).catch(()=>caches.match(r)))});
