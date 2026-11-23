/** A controllable clock for the live preview of a Gemini page. The page runs on virtual time exactly like the recorder does (same step logic), so it can be paused, resumed and opened at any second: the page is re-opened and fast-forwarded to that second without drawing anything. */
export function withClock(html: string, startSec: number, autoplay: boolean, endSec: number) {
  const script = `<script>(()=>{
const realSI=window.setInterval.bind(window),realCI=window.clearInterval.bind(window);
let now=0,id=1;const T0=1767225600000;const raf=new Map(),timers=new Map();const RD=Date;
performance.now=()=>now;
Date=class extends RD{constructor(...a){if(a.length)super(...a);else super(T0+now)}static now(){return T0+now}};
window.requestAnimationFrame=(cb)=>{raf.set(id,cb);return id++};
window.cancelAnimationFrame=(i)=>{raf.delete(i)};
window.setTimeout=(cb,ms=0,...a)=>{timers.set(id,{cb,due:now+Math.max(0,+ms||0),a,every:0});return id++};
window.setInterval=(cb,ms=0,...a)=>{const e=Math.max(1,+ms||1);timers.set(id,{cb,due:now+e,a,every:e});return id++};
window.clearTimeout=window.clearInterval=(i)=>{timers.delete(i)};
const step=(dt)=>{const end=now+dt;
for(let g=0;g<2000;g++){let best=null,bk=0;for(const [k,t] of timers)if(t.due<=end&&(!best||t.due<best.due)){best=t;bk=k}
if(!best)break;now=Math.max(now,best.due);if(best.every)best.due+=best.every;else timers.delete(bk);try{typeof best.cb==="function"&&best.cb(...best.a)}catch(e){}}
now=end;const list=[...raf];raf.clear();for(const [,cb] of list){try{cb(now)}catch(e){}}
try{for(const a of document.getAnimations()){if(a.__t0===undefined){a.__t0=now-dt;a.pause()}a.currentTime=now-a.__t0}}catch(e){}try{box()}catch(e){}};
const dt=1000/30,START=${Math.max(0, startSec) * 1000},END=${Math.max(1, endSec) * 1000};
let tm=null;
const post=(type)=>{try{parent.postMessage({type,t:now/1000,playing:!!tm},"*")}catch(e){}};
const pause=()=>{if(tm){realCI(tm);tm=null}post("state")};
const tick=()=>{if(now>=END-1){pause();post("end");return}step(dt);post("gt")};
const play=()=>{if(tm)return;tm=realSI(tick,dt);post("state")};
let pick=false,selEl=null,bases={},drag=null;const hl=document.createElement("div");hl.style.cssText="position:fixed;pointer-events:none;border:2px dashed #E8B44C;background:rgba(232,180,76,.14);border-radius:6px;z-index:2147483647;display:none";
const box=()=>{if(!pick||!selEl||!selEl.isConnected){hl.style.display="none";return}const r=selEl.getBoundingClientRect();hl.style.display="block";hl.style.left=r.left-3+"px";hl.style.top=r.top-3+"px";hl.style.width=r.width+6+"px";hl.style.height=r.height+6+"px"};
const pathOf=(el)=>{const p=[];while(el&&el!==document.body){const par=el.parentElement;if(!par)return null;p.unshift(":nth-child("+(Array.prototype.indexOf.call(par.children,el)+1)+")");el=par}return el&&p.length?"body > "+p.join(" > "):null};
const SVGNS="http://www.w3.org/2000/svg";const choose=(el,deep)=>{if(el&&el.namespaceURI===SVGNS&&!deep)el=el.ownerSVGElement||el;while(el&&el!==document.body&&el.nodeType===1&&el.namespaceURI!==SVGNS&&getComputedStyle(el).display==="inline")el=el.parentElement;if(!el||el===document.body||el===document.documentElement||el.id==="__shlogo")return false;const sel=pathOf(el);if(!sel)return false;selEl=el;box();try{parent.postMessage({type:"picked",sel,text:(el.textContent||"").replace(/\\s+/g," ").trim().slice(0,40)},"*")}catch(e){}return true};
const stop=(e)=>{if(pick){e.preventDefault();e.stopPropagation()}};
for(const ev of ["click","dblclick","mousedown","mouseup","touchstart","contextmenu"])window.addEventListener(ev,stop,true);
window.addEventListener("pointerdown",(e)=>{if(!pick)return;stop(e);const t=e.target;const inside=!!(selEl&&selEl.contains(t));if(!inside&&!choose(t))return;const sel=pathOf(selEl),b=bases[sel]||{x:0,y:0};drag={sx:e.clientX,sy:e.clientY,bx:b.x||0,by:b.y||0,dx:0,dy:0,sel,inner:inside&&t!==selEl?t:null}},true);
window.addEventListener("pointermove",(e)=>{if(!pick||!drag||!selEl)return;stop(e);drag.dx=e.clientX-drag.sx;drag.dy=e.clientY-drag.sy;if(Math.abs(drag.dx)+Math.abs(drag.dy)<4)return;selEl.style.setProperty("translate",(drag.bx+drag.dx)+"px "+(drag.by+drag.dy)+"px","important");box()},true);
window.addEventListener("pointerup",(e)=>{if(!drag)return;stop(e);const d=drag;drag=null;if(Math.abs(d.dx)+Math.abs(d.dy)<4&&d.inner&&d.inner.isConnected){choose(d.inner,true);return}if(Math.abs(d.dx)+Math.abs(d.dy)>=4){bases[d.sel]={x:d.bx+d.dx,y:d.by+d.dy};try{parent.postMessage({type:"moved",sel:d.sel,x:d.bx+d.dx,y:d.by+d.dy},"*")}catch(e2){}}},true);
window.addEventListener("message",(e)=>{const d=e.data||{};if(d.type==="play")play();else if(d.type==="pause")pause();else if(d.type==="to"){const T=Math.min(END,(+d.t||0)*1000);let g=0;while(now<T-1e-6&&g++<600)step(Math.min(dt,T-now))}else if(d.type==="pick"){pick=!!d.on;bases=d.bases||{};selEl=null;if(pick&&d.sel){try{selEl=document.querySelector(d.sel)}catch(e2){}}document.documentElement.style.cursor=pick?"pointer":"";box()}});
window.addEventListener("load",()=>{document.documentElement.appendChild(hl);while(now<START-1e-6)step(Math.min(dt,START-now));post("gt");post("ready");${autoplay ? "play()" : "post('state')"}});
})();</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + script) : script + html;
}
