import webpush from 'web-push';

const VAPID_PUBLIC_KEY='BHR4npmTzBKWQMZPYvoh8wdQIlM6SIvkMSA_f9IeGJNrZH5IHS0PAwCa9saiDJlF1Snn6UMYwlBdXyxFF80KwQ8';
const raw=process.env.PUSH_CONFIG_JSON||'';
const privateKey=process.env.VAPID_PRIVATE_KEY||'';
const test=process.env.TEST_PUSH==='1';

if(!raw||!privateKey){
  console.log('Web Push ainda não configurado: faltam PUSH_CONFIG_JSON e/ou VAPID_PRIVATE_KEY.');
  process.exit(0);
}

let cfg;
try{cfg=JSON.parse(raw)}catch(e){
  console.error('PUSH_CONFIG_JSON inválido.');
  process.exit(1);
}

if(!cfg.subscription?.endpoint||!cfg.subscription?.keys?.p256dh||!cfg.subscription?.keys?.auth){
  console.error('PUSH_CONFIG_JSON não contém uma PushSubscription válida.');
  process.exit(1);
}

if(!cfg.targetDate||!cfg.targetTime){
  console.error('PUSH_CONFIG_JSON não contém targetDate/targetTime.');
  process.exit(1);
}

const target=new Date(`${cfg.targetDate}T${cfg.targetTime}:00-03:00`);
if(Number.isNaN(target.getTime())){
  console.error('Data/hora final inválida.');
  process.exit(1);
}

let title,body,tag;
if(test){
  title='✅ Notificação com app fechado';
  body='Funcionou! Esta mensagem foi enviada pelo GitHub Actions via Web Push.';
  tag=`ferias-teste-${Date.now()}`;
}else{
  const remaining=target.getTime()-Date.now();
  const twelveHours=12*60*60*1000;
  if(remaining<=0||remaining>twelveHours){
    console.log(`Fora da janela das últimas 12 horas. Restante: ${Math.round(remaining/60000)} min.`);
    process.exit(0);
  }
  const hours=Math.ceil(remaining/(60*60*1000));
  title='🌴 Férias chegando!';
  body=`Faltam ${hours} ${hours===1?'hora':'horas'}!`;
  tag=`ferias-${cfg.targetDate}-${hours}`;
}

webpush.setVapidDetails(
  'mailto:lucasbreda007@gmail.com',
  VAPID_PUBLIC_KEY,
  privateKey
);

try{
  const response=await webpush.sendNotification(
    cfg.subscription,
    JSON.stringify({title,body,tag,url:'./index.html'}),
    {TTL:3600,urgency:'high'}
  );
  console.log(`Push enviado. Status: ${response.statusCode}`);
}catch(e){
  console.error('Falha ao enviar Web Push:',e.statusCode||'',e.body||e.message);
  process.exit(1);
}
