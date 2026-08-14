const CACHE_NAME="ferias-lm-v11";
const CORE=["./","./index.html","./manifest.webmanifest","./icon.svg","./notifications-v9.js","./weather-v10.js"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?event.data.text():""}}
  const title=data.title||"🌴 Férias do Lucas e da Mônica";
  const options={
    body:data.body||"",
    icon:"./icon.svg",
    badge:"./icon.svg",
    tag:data.tag||"ferias-push",
    renotify:true,
    data:{url:data.url||"./index.html"}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"./index.html";
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if("focus" in client){
          client.navigate?.(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

async function addAppModules(response){
  const text=await response.text();
  let html=text;
  if(!html.includes("notifications-v9.js"))html=html.replace("</body>",'<script src="./notifications-v9.js?v=11"></script></body>');
  if(!html.includes("weather-v10.js"))html=html.replace("</body>",'<script src="./weather-v10.js?v=10"></script></body>');
  const headers=new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type","text/html; charset=utf-8");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  if(event.request.mode==="navigate"){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:"no-store"});
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put("./index.html",copy));
        return addAppModules(response);
      }catch(_){
        const cached=await caches.match("./index.html");
        return cached?addAppModules(cached):Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
