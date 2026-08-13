(()=>{'use strict';

const KEY='ferias-lucas-monica-config-v5';
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const tm=v=>{if(!v)return null;const[a,b]=v.split(':').map(Number);return a*60+b};
const hm=(v,signed=false)=>{let sg=v<0?'−':signed?'+':'';v=Math.abs(Math.round(v));return sg+pad(Math.floor(v/60))+':'+pad(v%60)};
const hms=sec=>{sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/3600)).padStart(2,'0')+':'+pad(Math.floor(sec%3600/60))+':'+pad(sec%60)};
const dateVal=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

let extrasCache={bankStandard:null,bankToday:null};
let manualBankTouched=false;

function load(){
  try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}
}
function save(c){
  c.savedAt=Date.now();
  localStorage.setItem(KEY,JSON.stringify(c));
  extrasCache.bankStandard=c.bankStandard||null;
  extrasCache.bankToday=c.bankToday||null;
}
function bankMinutes(c){
  if(!c||!c.bankEnabled)return 0;
  return Number(c.bankSign||1)*(Math.max(0,Number(c.bankHours)||0)*60+Math.max(0,Math.min(59,Number(c.bankMinutes)||0)));
}
function setBank(c,min){
  c.bankEnabled=true;
  c.bankSign=min<0?-1:1;
  min=Math.abs(Math.round(min));
  c.bankHours=Math.floor(min/60);
  c.bankMinutes=min%60;
}
function rowMinutes(s){
  if(!s||s.active===false)return 0;
  let z=0;
  [[s.a1,s.b1],[s.a2,s.b2]].forEach(([a,b])=>{
    if(!a||!b)return;
    a=tm(a);b=tm(b);
    if(a!==null&&b!==null&&b>a)z+=b-a
  });
  return z
}
function inferStandard(c){
  if(c?.bankStandard)return {...c.bankStandard};
  if(c?.schedule){
    for(const d of [1,2,3,4,5,6,0]){
      const s=c.schedule[d]||c.schedule[String(d)];
      if(s&&s.active&&s.a1&&s.b1&&s.a2&&s.b2){
        return {a1:s.a1,b1:s.b1,a2:s.a2,b2:s.b2}
      }
    }
  }
  return {a1:'07:30',b1:'12:00',a2:'13:12',b2:'17:30'}
}
function validFull(s){
  if(!s.a1||!s.b1||!s.a2||!s.b2)return 'Preencha os quatro horários.';
  const a1=tm(s.a1),b1=tm(s.b1),a2=tm(s.a2),b2=tm(s.b2);
  if(!(a1<b1&&b1<=a2&&a2<b2))return 'Revise a sequência dos horários.';
  return ''
}
function todayKey(){return dateVal(new Date())}
function getStandardForm(){return {a1:$('bsA1').value,b1:$('bsB1').value,a2:$('bsA2').value,b2:$('bsB2').value}}
function getActualForm(){
  if($('baOff').checked)return {off:true,a1:'',b1:'',a2:'',b2:''};
  return {off:false,a1:$('baA1').value,b1:$('baB1').value,a2:$('baA2').value,b2:$('baB2').value}
}
function todayExisting(c){
  return c?.bankToday&&c.bankToday.date===todayKey()?c.bankToday:null
}
function css(){
  if($('bankAutoStyle'))return;
  const st=document.createElement('style');
  st.id='bankAutoStyle';
  st.textContent=`
#bankAutoSection{margin-top:0}
.ba-wrap{margin-top:9px;padding:12px;border:1px solid #dce8e9;border-radius:16px;background:#f8fbfb}
.ba-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}
.ba-f{min-width:0}.ba-f label{display:block;margin:0 0 5px 2px;color:#596f73;font-size:8px;font-weight:950;text-transform:uppercase}
.ba-f input{width:100%;min-width:0;height:43px;border:1px solid #d5e2e3;border-radius:12px;background:#fff;color:#173337;padding:0 6px;font-size:14px}
.ba-f input:disabled{opacity:.42;background:#eef3f3}
.ba-label{margin-top:12px;color:#004F59;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.05em}
.ba-help{margin:4px 0 0;color:#687e82;font-size:10px;line-height:1.45}
.ba-off{margin-top:9px}.ba-off label{display:flex;align-items:center;gap:8px;color:#566e72;font-size:11px;font-weight:900}.ba-off input{width:18px;height:18px;accent-color:#004F59}
.ba-result{margin-top:10px;padding:11px;border-radius:13px;background:#eef7f6;color:#557075;font-size:11px;line-height:1.6}
.ba-result strong{color:#173337}.ba-plus{color:#17785c!important}.ba-minus{color:#a34740!important}
.ba-live{display:inline-block;margin-top:7px;padding:5px 8px;border-radius:999px;background:#e7f5ef;color:#17785c;font-size:9px;font-weight:950}
.ba-reset{width:100%;min-height:42px;margin-top:8px;border:1px solid #dce8e9;border-radius:13px;background:#fff;color:#6a7d81;font-weight:900}
.ba-hidden{display:none!important}
@media(max-width:430px){.ba-grid{grid-template-columns:1fr 1fr}.ba-f input{font-size:16px}}
`;
  document.head.appendChild(st)
}
function inject(){
  if($('bankAutoSection')||!$('cfgBank'))return;
  css();

  $('cfgBank').insertAdjacentHTML('afterend',`
    <div id="bankAutoSection" class="ba-hidden">
      <div class="section-title">Compensação automática do banco</div>
      <p class="section-help">Defina uma única jornada padrão. Depois informe o horário que você realmente está fazendo hoje. O app compara os dois e ajusta o banco automaticamente.</p>

      <div class="ba-wrap">
        <div class="ba-label">Jornada padrão</div>
        <p class="ba-help">É a sua jornada normal de todos os dias.</p>
        <div class="ba-grid">
          <div class="ba-f"><label>1ª entrada</label><input type="time" id="bsA1"></div>
          <div class="ba-f"><label>1ª saída</label><input type="time" id="bsB1"></div>
          <div class="ba-f"><label>2ª entrada</label><input type="time" id="bsA2"></div>
          <div class="ba-f"><label>2ª saída</label><input type="time" id="bsB2"></div>
        </div>

        <div class="ba-label">Horário feito hoje</div>
        <p class="ba-help">Informe os quatro horários que você está fazendo na prática. Quando os quatro estiverem válidos, o saldo é recalculado automaticamente.</p>
        <div class="ba-off"><label><input type="checkbox" id="baOff"> Hoje não trabalhei</label></div>
        <div class="ba-grid">
          <div class="ba-f"><label>1ª entrada</label><input type="time" id="baA1"></div>
          <div class="ba-f"><label>1ª saída</label><input type="time" id="baB1"></div>
          <div class="ba-f"><label>2ª entrada</label><input type="time" id="baA2"></div>
          <div class="ba-f"><label>2ª saída</label><input type="time" id="baB2"></div>
        </div>

        <div id="baResult" class="ba-result">Preencha a jornada padrão e o horário feito hoje.</div>
        <button id="baReset" type="button" class="ba-reset ba-hidden">LIMPAR HORÁRIO DE HOJE</button>
      </div>
    </div>
  `);

  const c=load();
  if(c){
    extrasCache.bankStandard=c.bankStandard||null;
    extrasCache.bankToday=c.bankToday||null;
  }

  ['bsA1','bsB1','bsA2','bsB2'].forEach(id=>{
    $(id).addEventListener('change',()=>{storeStandardAndMaybeApply()});
    $(id).addEventListener('input',preview)
  });
  ['baA1','baB1','baA2','baB2'].forEach(id=>{
    $(id).addEventListener('change',()=>{autoApplyIfReady()});
    $(id).addEventListener('input',preview)
  });
  $('baOff').addEventListener('change',()=>{
    toggleActual();
    autoApplyIfReady()
  });
  $('baReset').addEventListener('click',resetToday);

  document.querySelectorAll('input[name="cfgHasBank"]').forEach(x=>x.addEventListener('change',()=>{
    refreshVisibility();
    if(enabledInSettings())fill()
  }));
  $('openSettings')?.addEventListener('click',()=>setTimeout(()=>{manualBankTouched=false;refreshVisibility();fill()},0));

  ['cSign','cBH','cBM'].forEach(id=>{
    $(id)?.addEventListener('input',()=>{manualBankTouched=true});
    $(id)?.addEventListener('change',()=>{manualBankTouched=true})
  });

  $('saveSettings')?.addEventListener('click',()=>{
    const keepStd=extrasCache.bankStandard?{...extrasCache.bankStandard}:null;
    const keepToday=manualBankTouched?null:(extrasCache.bankToday?{...extrasCache.bankToday}:null);
    setTimeout(()=>{
      const n=load();
      if(!n)return;
      n.bankStandard=keepStd;
      n.bankToday=keepToday;
      save(n);
      syncPortal();
      manualBankTouched=false
    },30)
  });

  refreshVisibility();
  fill();
  setInterval(syncPortal,700)
}
function enabledInSettings(){
  return document.querySelector('input[name="cfgHasBank"]:checked')?.value==='1'
}
function refreshVisibility(){
  if(!$('bankAutoSection'))return;
  $('bankAutoSection').classList.toggle('ba-hidden',!enabledInSettings())
}
function fill(){
  const c=load();
  if(!c||!$('bankAutoSection'))return;
  const st=inferStandard(c);
  $('bsA1').value=st.a1||'';$('bsB1').value=st.b1||'';$('bsA2').value=st.a2||'';$('bsB2').value=st.b2||'';

  const ex=todayExisting(c);
  $('baOff').checked=!!ex?.off;
  $('baA1').value=ex?.a1||'';
  $('baB1').value=ex?.b1||'';
  $('baA2').value=ex?.a2||'';
  $('baB2').value=ex?.b2||'';
  $('baReset').classList.toggle('ba-hidden',!ex);
  toggleActual();
  preview()
}
function toggleActual(){
  const off=$('baOff').checked;
  ['baA1','baB1','baA2','baB2'].forEach(id=>$(id).disabled=off)
}
function preview(){
  const c=load();
  if(!c||!$('baResult'))return;
  const st=getStandardForm();
  const e1=validFull(st);
  if(e1){
    $('baResult').innerHTML=`Jornada padrão: <strong>${e1}</strong>`;
    return
  }
  const standard=rowMinutes({...st,active:true});
  const actual=getActualForm();

  if(!actual.off){
    const blank=[actual.a1,actual.b1,actual.a2,actual.b2].some(v=>!v);
    if(blank){
      const ex=todayExisting(c);
      $('baResult').innerHTML=`Jornada padrão: <strong>${hm(standard)}</strong><br>Preencha os quatro horários feitos hoje para calcular.${ex?`<br>Variação atualmente aplicada: <strong>${ex.delta>=0?'+':''}${hm(ex.delta)}</strong>`:''}`;
      return
    }
    const e2=validFull(actual);
    if(e2){
      $('baResult').innerHTML=`Jornada feita hoje: <strong>${e2}</strong>`;
      return
    }
  }

  const actualMin=actual.off?0:rowMinutes({...actual,active:true});
  const delta=actualMin-standard;
  const ex=todayExisting(c);
  const old=ex?Number(ex.delta)||0:0;
  const projected=bankMinutes(c)-old+delta;
  const cl=delta>0?'ba-plus':delta<0?'ba-minus':'';

  $('baResult').innerHTML=
    `Jornada padrão: <strong>${hm(standard)}</strong><br>`+
    `Jornada feita hoje: <strong>${hm(actualMin)}</strong><br>`+
    `Variação do banco: <strong class="${cl}">${delta>=0?'+':''}${hm(delta)}</strong><br>`+
    `Saldo projetado: <strong>${hm(projected,true)}</strong>`;
}
function storeStandardAndMaybeApply(){
  const c=load();
  if(!c)return;
  const st=getStandardForm();
  const err=validFull(st);
  if(err){preview();return}
  c.bankStandard={...st};
  save(c);
  const actual=getActualForm();
  if(actual.off||[actual.a1,actual.b1,actual.a2,actual.b2].every(Boolean)){
    autoApplyIfReady()
  }else{
    preview()
  }
}
function autoApplyIfReady(){
  const c=load();
  if(!c||!c.bankEnabled)return;
  const st=getStandardForm();
  const e1=validFull(st);
  if(e1){preview();return}

  const actual=getActualForm();
  if(!actual.off){
    if([actual.a1,actual.b1,actual.a2,actual.b2].some(v=>!v)){preview();return}
    const e2=validFull(actual);
    if(e2){preview();return}
  }

  const standard=rowMinutes({...st,active:true});
  const actualMin=actual.off?0:rowMinutes({...actual,active:true});
  const delta=actualMin-standard;
  const ex=todayExisting(c);
  const old=ex?Number(ex.delta)||0:0;
  const newBalance=bankMinutes(c)-old+delta;

  c.bankStandard={...st};
  setBank(c,newBalance);
  c.bankToday={
    date:todayKey(),off:actual.off,
    a1:actual.a1,b1:actual.b1,a2:actual.a2,b2:actual.b2,
    standard,actual:actualMin,delta,savedAt:Date.now()
  };
  save(c);
  $('baReset').classList.remove('ba-hidden');

  const cl=delta>0?'ba-plus':delta<0?'ba-minus':'';
  $('baResult').innerHTML=
    `Jornada padrão: <strong>${hm(standard)}</strong><br>`+
    `Jornada feita hoje: <strong>${hm(actualMin)}</strong><br>`+
    `Variação do banco: <strong class="${cl}">${delta>=0?'+':''}${hm(delta)}</strong><br>`+
    `Saldo atualizado: <strong>${hm(newBalance,true)}</strong><br>`+
    `<span class="ba-live">✓ compensado automaticamente</span>`;
  syncPortal()
}
function resetToday(){
  const c=load();
  if(!c)return;
  const ex=todayExisting(c);
  if(ex){
    const restored=bankMinutes(c)-(Number(ex.delta)||0);
    setBank(c,restored);
    c.bankToday=null;
    save(c)
  }
  $('baOff').checked=false;
  ['baA1','baB1','baA2','baB2'].forEach(id=>{$(id).value='';$(id).disabled=false});
  $('baReset').classList.add('ba-hidden');
  preview();
  syncPortal()
}

function intervals(c,day){
  const s=c?.schedule?.[day.getDay()]||c?.schedule?.[String(day.getDay())];
  if(!s||!s.active)return[];
  const out=[];
  [[s.a1,s.b1],[s.a2,s.b2]].forEach(([a,b])=>{
    if(!a||!b)return;
    const[ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number);
    const st=new Date(day.getFullYear(),day.getMonth(),day.getDate(),ah,am);
    const en=new Date(day.getFullYear(),day.getMonth(),day.getDate(),bh,bm);
    if(en>st)out.push([st,en])
  });
  return out
}
function target(c){
  if(!c?.targetDate||!c?.targetTime)return null;
  const[y,m,d]=c.targetDate.split('-').map(Number),[h,mi]=c.targetTime.split(':').map(Number);
  return new Date(y,m-1,d,h,mi)
}
function usefulMinutes(c,now,t){
  if(!t||t<=now)return 0;
  let total=0,day=new Date(now.getFullYear(),now.getMonth(),now.getDate()),last=new Date(t.getFullYear(),t.getMonth(),t.getDate());
  for(let i=0;day<=last&&i<370;i++){
    for(let[a,b]of intervals(c,day)){
      a=a<now?now:a;b=b>t?t:b;if(b>a)total+=b-a
    }
    day.setDate(day.getDate()+1)
  }
  return total/60000
}
function syncPortal(){
  const c=load();
  if(!c||!c.bankEnabled)return;
  const bank=bankMinutes(c);
  if($('bankNow'))$('bankNow').textContent=hm(bank,true);

  const t=target(c),now=new Date(),raw=usefulMinutes(c,now,t),left=Math.max(0,raw*60-bank*60);
  if($('useful'))$('useful').textContent=hms(left);
  if($('targetLine')&&t){
    const end=t.toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    $('targetLine').innerHTML=`Fim do expediente: <strong>${end}</strong><br>Expediente restante: <strong>${hm(raw)}</strong> · Após banco: <strong>${hm(left/60)}</strong>`
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);
else inject();

})();