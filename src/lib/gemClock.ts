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
try{for(const a of document.getAnimations()){if(a.__t0===undefined){a.__t0=now-dt;a.pause()}a.currentTime=now-a.__t0}}catch(e){}};
const dt=1000/30,START=${Math.max(0, startSec) * 1000},END=${Math.max(1, endSec) * 1000};
let tm=null;
const post=(type)=>{try{parent.postMessage({type,t:now/1000,playing:!!tm},"*")}catch(e){}};
const pause=()=>{if(tm){realCI(tm);tm=null}post("state")};
const tick=()=>{if(now>=END-1){pause();post("end");return}step(dt);post("gt")};
const play=()=>{if(tm)return;tm=realSI(tick,dt);post("state")};
window.addEventListener("message",(e)=>{const d=e.data||{};if(d.type==="play")play();else if(d.type==="pause")pause()});
window.addEventListener("load",()=>{while(now<START-1e-6)step(Math.min(dt,START-now));post("gt");${autoplay ? "play()" : "post('state')"}});
})();</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + script) : script + html;
}
