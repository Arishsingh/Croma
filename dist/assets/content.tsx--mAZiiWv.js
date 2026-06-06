import{d as b,A as S,y as E,u as t,S as w,R as z}from"./hooks.module-CwlBfBTs.js";const C={visible:!1,feature:"code-explain",text:"",mode:"idle"};let x=null,f={...C};function p(e){f={...f,...e},x==null||x(f)}const s={show:e=>p({visible:!0,feature:e,text:"",mode:"loading"}),hide:()=>p({visible:!1}),chunk:e=>p({text:f.text+e,mode:"streaming"}),done:()=>p({mode:"done"}),error:e=>p({text:e,mode:"error"})};let u=null;function T(e){u=e}function A(e){let o=e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");return o=o.replace(/```(?:\w*)\n?([\s\S]*?)```/g,(r,i)=>`<pre><code>${i.trim()}</code></pre>`),o=o.replace(/`([^`\n]+)`/g,"<code>$1</code>"),o=o.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>"),o=o.replace(/^(→\s.+:)\s*$/gm,'<p class="sec">$1</p>'),o=o.replace(/^(\d+)\.\s+/gm,'<span class="num">$1</span> '),o=o.replace(/^\s*[-–]\s+/gm,'<span class="bul">—</span> '),o.split(/\n{2,}/).map(r=>r.startsWith("<pre>")||r.startsWith('<p class="sec">')?r:`<p>${r.split(`
`).filter(Boolean).join("<br>")}</p>`).join("")}const j=`
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.root {
  position: fixed; top: 0; right: 0;
  width: 360px; height: 100vh;
  z-index: 2147483647;
  display: flex; flex-direction: column;
  background: #0a0a0b;
  color: #d4d4d8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 13px; line-height: 1.6;
  border-left: 1px solid #18181b;
  box-shadow: -8px 0 48px rgba(0,0,0,0.7);
  transition: transform 0.22s ease;
}
.root.off { transform: translateX(100%); pointer-events: none; }

/* ── header ── */
.hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid #18181b;
  flex-shrink: 0;
}
.brand { font-size: 13px; font-weight: 600; letter-spacing: -0.2px; color: #fafafa; }
.brand em { font-style: normal; color: #71717a; font-weight: 400; }
.tag {
  font-size: 10px; font-weight: 500; letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 7px; border-radius: 3px;
  background: #18181b; color: #a1a1aa; border: 1px solid #27272a;
  margin-left: 8px;
}
.x {
  width: 22px; height: 22px; border-radius: 4px;
  background: none; border: none;
  color: #52525b; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, background .15s;
}
.x:hover { color: #d4d4d8; background: #18181b; }

/* ── body ── */
.bd {
  flex: 1; overflow-y: auto; padding: 16px 14px;
  scrollbar-width: thin; scrollbar-color: #27272a transparent;
}
.bd::-webkit-scrollbar { width: 3px; }
.bd::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }

/* idle */
.empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: #3f3f46; text-align: center;
}
.empty-title { font-size: 12px; font-weight: 500; color: #52525b; margin-bottom: 8px; }
.hint {
  width: 100%; font-size: 11.5px; padding: 7px 10px;
  background: #111113; border: 1px solid #1e1e22;
  border-radius: 5px; color: #52525b; text-align: left;
}
.hint b { color: #71717a; font-weight: 600; }

/* loading */
.ld { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
.ld-text { font-size: 11.5px; color: #52525b; }
.dots { display: flex; gap: 3px; }
.dot {
  width: 5px; height: 5px; background: #3f3f46; border-radius: 50%;
  animation: blink 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink {
  0%,80%,100% { opacity:.2; transform:scale(.8); }
  40% { opacity:1; transform:scale(1); }
}

/* output */
.out { color: #d4d4d8; font-size: 13px; }
.out p { margin-bottom: 10px; }
.out p:last-child { margin-bottom: 0; }
.out b { color: #fafafa; font-weight: 600; }
.out code {
  font-family: 'SF Mono','Fira Code',Menlo,monospace;
  font-size: 11.5px;
  background: #111113; border: 1px solid #1e1e22;
  border-radius: 3px; padding: 1px 5px; color: #a1a1aa;
}
.out pre {
  background: #0d0d0f; border: 1px solid #1e1e22;
  border-radius: 6px; padding: 12px; margin: 10px 0;
  overflow-x: auto;
}
.out pre code {
  background: none; border: none; padding: 0;
  color: #d4d4d8; font-size: 12px; line-height: 1.65;
}
.out .sec {
  font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: #52525b;
  margin: 14px 0 6px; padding-bottom: 6px;
  border-bottom: 1px solid #18181b;
}
.out .num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; font-size: 10px; font-weight: 700;
  background: #18181b; border: 1px solid #27272a;
  border-radius: 3px; color: #71717a; vertical-align: middle;
  margin-right: 2px;
}
.out .bul { color: #3f3f46; margin-right: 4px; }
.out.err { color: #f87171; }

/* actions */
.acts { display: flex; gap: 6px; margin-top: 14px; }
.btn {
  padding: 5px 11px; font-size: 11.5px; font-weight: 500;
  font-family: inherit; border-radius: 5px; cursor: pointer;
  transition: all .15s;
}
.btn-copy {
  background: #111113; border: 1px solid #27272a; color: #a1a1aa;
}
.btn-copy:hover { border-color: #3f3f46; color: #d4d4d8; }
.btn-dim {
  background: none; border: 1px solid #18181b; color: #3f3f46;
}
.btn-dim:hover { color: #71717a; border-color: #27272a; }

/* ── footer ── */
.sep { height: 1px; background: #111113; flex-shrink: 0; }
.ft { padding: 10px 12px; flex-shrink: 0; }
.row {
  display: flex; align-items: center; gap: 6px;
  background: #111113; border: 1px solid #1e1e22;
  border-radius: 6px; padding: 7px 10px;
  transition: border-color .15s;
}
.row:focus-within { border-color: #3f3f46; }
.inp {
  flex: 1; background: none; border: none; outline: none;
  color: #d4d4d8; font-family: inherit; font-size: 12.5px;
}
.inp::placeholder { color: #3f3f46; }
.send {
  padding: 4px 10px; background: #18181b;
  border: 1px solid #27272a; border-radius: 4px;
  color: #71717a; font-size: 11px; font-weight: 600;
  font-family: inherit; cursor: pointer; transition: all .15s;
  flex-shrink: 0;
}
.send:hover { background: #27272a; color: #d4d4d8; }
`;function _(){const[e,o]=b(f),[n,r]=b(""),[i,l]=b(!1),a=S(null);x=o,E(()=>{a.current&&e.mode==="streaming"&&(a.current.scrollTop=a.current.scrollHeight)},[e.text]);function g(c){c.preventDefault(),n.trim()&&(s.show("docs-ai"),u==null||u(n.trim()),r(""))}function m(){navigator.clipboard.writeText(e.text),l(!0),setTimeout(()=>l(!1),1400)}return t(w,{children:[t("style",{children:j}),t("div",{class:`root${e.visible?"":" off"}`,children:[t("div",{class:"hd",children:[t("div",{style:{display:"flex",alignItems:"center"},children:t("span",{class:"brand",children:"Croma"})}),t("button",{class:"x",onClick:()=>s.hide(),children:"✕"})]}),t("div",{class:"bd",ref:a,children:[e.mode==="idle"&&t("div",{class:"empty",children:[t("div",{class:"empty-title",children:"Ready"}),t("div",{class:"hint",children:[t("b",{children:"Select code"})," or text on any page"]}),t("div",{class:"hint",children:[t("b",{children:"Errors"})," on localhost are caught automatically"]}),t("div",{class:"hint",children:[t("b",{children:"Ask below"})," about anything on this page"]})]}),e.mode==="loading"&&t("div",{class:"ld",children:[t("div",{class:"dots",children:[t("div",{class:"dot"}),t("div",{class:"dot"}),t("div",{class:"dot"})]}),t("span",{class:"ld-text",children:"Thinking…"})]}),(e.mode==="streaming"||e.mode==="done"||e.mode==="error")&&t(w,{children:[t("div",{class:`out${e.mode==="error"?" err":""}`,dangerouslySetInnerHTML:{__html:A(e.text)}}),e.mode==="done"&&e.text&&t("div",{class:"acts",children:[t("button",{class:"btn btn-copy",onClick:m,children:i?"✓ Copied":"Copy"}),t("button",{class:"btn btn-dim",onClick:()=>s.hide(),children:"Dismiss"})]})]})]}),t("div",{class:"sep"}),t("div",{class:"ft",children:t("form",{onSubmit:g,children:t("div",{class:"row",children:[t("input",{class:"inp",type:"text",value:n,onInput:c=>r(c.target.value),placeholder:"Ask about this page…"}),t("button",{class:"send",type:"submit",children:"Ask"})]})})})]})]})}const h=window===window.top;if(h){const e=document.createElement("div");e.style.cssText="position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;",document.documentElement.appendChild(e);const o=e.attachShadow({mode:"open"}),n=document.createElement("div");o.appendChild(n),z(t(_,{}),n)}const F=["localhost","127.0.0.1","0.0.0.0"].some(e=>location.hostname===e||location.hostname.startsWith(e+":"));function v(){var e;try{return!!((e=chrome.runtime)!=null&&e.id)}catch{return!1}}function d(e,o,n){var r;if(v()){h?s.show(o):(r=window.top)==null||r.postMessage({__croma:!0,type:"SHOW",feature:o},"*");try{chrome.runtime.sendMessage({type:"ASK_CLAUDE",prompt:e,feature:o,context:n})}catch{h&&s.error("Extension was reloaded. Refresh this page to reconnect Croma.")}}}h&&window.addEventListener("message",e=>{var o;(o=e.data)!=null&&o.__croma&&e.data.type==="SHOW"&&s.show(e.data.feature)});T(e=>{const o=document.body.innerText.slice(0,3e4);d(e,"docs-ai",o)});h&&v()&&chrome.runtime.onMessage.addListener(e=>{e.type==="CHUNK"&&s.chunk(e.text),e.type==="DONE"&&s.done(),e.type==="ERROR"&&s.error(e.message)});const I=/[{}[\]();=><]|function |const |let |var |import |class |def |return |=>/;let y,k="";document.addEventListener("selectionchange",()=>{clearTimeout(y),y=setTimeout(()=>{var i;const e=((i=window.getSelection())==null?void 0:i.toString().trim())??"";if(!e||e===k)return;const o=I.test(e)&&e.length>=30,n=!o&&e.length>=60;if(!o&&!n)return;k=e;const r=o?`Explain this code:
\`\`\`
${e}
\`\`\``:`Explain this clearly and concisely:

${e}`;d(r,"code-explain")},600)});if(F){const e=console.error.bind(console);console.error=(...o)=>{e(...o);const n=o.map(String).join(" ");n.length<10||d(`Fix this console error:
${n}`,"error-fix")},window.addEventListener("error",o=>{var r;const n=[`Error: ${o.message}`,`File: ${o.filename}:${o.lineno}:${o.colno}`,(r=o.error)!=null&&r.stack?`Stack:
${o.error.stack}`:""].filter(Boolean).join(`
`);d(`Fix this runtime error:
${n}`,"error-fix")}),window.addEventListener("unhandledrejection",o=>{const n=o.reason instanceof Error?`${o.reason.message}
${o.reason.stack??""}`:String(o.reason);d(`Fix this unhandled promise rejection:
${n}`,"error-fix")})}const L=window.fetch.bind(window);window.fetch=async(...e)=>{var i;const o=Date.now(),n=await L(...e),r=Date.now()-o;if(n.status>=400||r>1500){const l=typeof e[0]=="string"?e[0]:e[0].url,a=(((i=e[1])==null?void 0:i.method)??"GET").toUpperCase(),m=await n.clone().text().catch(()=>"").then($=>$.slice(0,400)),c=n.status>=400?`API request failed:
${a} ${l}
Status: ${n.status}
Response body: ${m}

Why did this fail and how do I fix it?`:`API request is slow (${r}ms):
${a} ${l}
Status: ${n.status}

What's likely causing the slowness and how do I optimize it?`;d(c,"network-explain")}return n};
