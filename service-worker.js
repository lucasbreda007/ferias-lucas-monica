const CACHE_NAME="ferias-lm-v6";
const CORE=["./","./index.html","./manifest.webmanifest","./icon.svg","./bank-tools.js"];

self.addEventListener("install",e=>e.waitUntil(
  caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener("activate",e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

async function injectBankTools(response){
  const text=await response.text();
  const html=text.includes("bank-tools.js")
    ? text
    : text.replace("</body>",'<script src="./bank-tools.js?v=6"></script></body>');
  const headers=new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type","text/html; charset=utf-8");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;

  if(e.request.mode==="navigate"){
    e.respondWith((async()=>{
      try{
        const r=await fetch(e.request,{cache:"no-store"});
        const copy=r.clone();
        caches.open(CACHE_NAME).then(c=>c.put("./index.html",copy));
        return await injectBankTools(r);
      }catch(_){
        const cached=await caches.match("./index.html");
        return cached?injectBankTools(cached):Response.error();
      }
    })());
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(x=>x.put(e.request,c));return r})
      .catch(()=>caches.match(e.request))
  );
});
