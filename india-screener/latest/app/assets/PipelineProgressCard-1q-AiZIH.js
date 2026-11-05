import{r as V,j as o,c as W,g as J}from"./react-vendor-8-HzCkcP.js";import{g as X,a as H,u as G,_ as Q,b as v,A as Y,s as _,c as Z,i as f,d as S,ae as R,j as B,af as $,H as rr,J as er,ag as or,P as L,a2 as M,B as l,C as O,T as c,I as P,ah as tr}from"./index-WomuBFDk.js";import{R as sr,A as w}from"./Remove-BfZ1_Q-p.js";function ar(r){return X("MuiLinearProgress",r)}H("MuiLinearProgress",["root","colorPrimary","colorSecondary","determinate","indeterminate","buffer","query","dashed","dashedColorPrimary","dashedColorSecondary","bar","barColorPrimary","barColorSecondary","bar1Indeterminate","bar1Determinate","bar1Buffer","bar2Indeterminate","bar2Buffer"]);const nr=["className","color","value","valueBuffer","variant"];let y=r=>r,q,A,T,F,D,E;const k=4,ir=$(q||(q=y`
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
`)),lr=$(A||(A=y`
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
`)),cr=$(T||(T=y`
  0% {
    opacity: 1;
    background-position: 0 -23px;
  }

  60% {
    opacity: 0;
    background-position: 0 -23px;
  }

  100% {
    opacity: 1;
    background-position: -200px -23px;
  }
`)),dr=r=>{const{classes:e,variant:t,color:n}=r,p={root:["root",`color${f(n)}`,t],dashed:["dashed",`dashedColor${f(n)}`],bar1:["bar",`barColor${f(n)}`,(t==="indeterminate"||t==="query")&&"bar1Indeterminate",t==="determinate"&&"bar1Determinate",t==="buffer"&&"bar1Buffer"],bar2:["bar",t!=="buffer"&&`barColor${f(n)}`,t==="buffer"&&`color${f(n)}`,(t==="indeterminate"||t==="query")&&"bar2Indeterminate",t==="buffer"&&"bar2Buffer"]};return S(p,ar,e)},z=(r,e)=>e==="inherit"?"currentColor":r.vars?r.vars.palette.LinearProgress[`${e}Bg`]:r.palette.mode==="light"?B.lighten(r.palette[e].main,.62):B.darken(r.palette[e].main,.5),ur=_("span",{name:"MuiLinearProgress",slot:"Root",overridesResolver:(r,e)=>{const{ownerState:t}=r;return[e.root,e[`color${f(t.color)}`],e[t.variant]]}})(({ownerState:r,theme:e})=>v({position:"relative",overflow:"hidden",display:"block",height:4,zIndex:0,"@media print":{colorAdjust:"exact"},backgroundColor:z(e,r.color)},r.color==="inherit"&&r.variant!=="buffer"&&{backgroundColor:"none","&::before":{content:'""',position:"absolute",left:0,top:0,right:0,bottom:0,backgroundColor:"currentColor",opacity:.3}},r.variant==="buffer"&&{backgroundColor:"transparent"},r.variant==="query"&&{transform:"rotate(180deg)"})),fr=_("span",{name:"MuiLinearProgress",slot:"Dashed",overridesResolver:(r,e)=>{const{ownerState:t}=r;return[e.dashed,e[`dashedColor${f(t.color)}`]]}})(({ownerState:r,theme:e})=>{const t=z(e,r.color);return v({position:"absolute",marginTop:0,height:"100%",width:"100%"},r.color==="inherit"&&{opacity:.3},{backgroundImage:`radial-gradient(${t} 0%, ${t} 16%, transparent 42%)`,backgroundSize:"10px 10px",backgroundPosition:"0 -23px"})},R(F||(F=y`
    animation: ${0} 3s infinite linear;
  `),cr)),mr=_("span",{name:"MuiLinearProgress",slot:"Bar1",overridesResolver:(r,e)=>{const{ownerState:t}=r;return[e.bar,e[`barColor${f(t.color)}`],(t.variant==="indeterminate"||t.variant==="query")&&e.bar1Indeterminate,t.variant==="determinate"&&e.bar1Determinate,t.variant==="buffer"&&e.bar1Buffer]}})(({ownerState:r,theme:e})=>v({width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left",backgroundColor:r.color==="inherit"?"currentColor":(e.vars||e).palette[r.color].main},r.variant==="determinate"&&{transition:`transform .${k}s linear`},r.variant==="buffer"&&{zIndex:1,transition:`transform .${k}s linear`}),({ownerState:r})=>(r.variant==="indeterminate"||r.variant==="query")&&R(D||(D=y`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    `),ir)),xr=_("span",{name:"MuiLinearProgress",slot:"Bar2",overridesResolver:(r,e)=>{const{ownerState:t}=r;return[e.bar,e[`barColor${f(t.color)}`],(t.variant==="indeterminate"||t.variant==="query")&&e.bar2Indeterminate,t.variant==="buffer"&&e.bar2Buffer]}})(({ownerState:r,theme:e})=>v({width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left"},r.variant!=="buffer"&&{backgroundColor:r.color==="inherit"?"currentColor":(e.vars||e).palette[r.color].main},r.color==="inherit"&&{opacity:.3},r.variant==="buffer"&&{backgroundColor:z(e,r.color),transition:`transform .${k}s linear`}),({ownerState:r})=>(r.variant==="indeterminate"||r.variant==="query")&&R(E||(E=y`
      width: auto;
      animation: ${0} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
    `),lr)),br=V.forwardRef(function(e,t){const n=G({props:e,name:"MuiLinearProgress"}),{className:p,color:I="primary",value:d,valueBuffer:m,variant:a="indeterminate"}=n,x=Q(n,nr),i=v({},n,{color:I,variant:a}),u=dr(i),j=Y(),b={},g={bar1:{},bar2:{}};if((a==="determinate"||a==="buffer")&&d!==void 0){b["aria-valuenow"]=Math.round(d),b["aria-valuemin"]=0,b["aria-valuemax"]=100;let s=d-100;j&&(s=-s),g.bar1.transform=`translateX(${s}%)`}if(a==="buffer"&&m!==void 0){let s=(m||0)-100;j&&(s=-s),g.bar2.transform=`translateX(${s}%)`}return o.jsxs(ur,v({className:Z(u.root,p),ownerState:i,role:"progressbar"},b,{ref:t},x,{children:[a==="buffer"?o.jsx(fr,{className:u.dashed,ownerState:i}):null,o.jsx(mr,{className:u.bar1,ownerState:i,style:g.bar1}),a==="determinate"?null:o.jsx(xr,{className:u.bar2,ownerState:i,style:g.bar2})]}))});var C={},N;function gr(){if(N)return C;N=1;var r=rr();Object.defineProperty(C,"__esModule",{value:!0}),C.default=void 0;var e=r(er()),t=W();return C.default=(0,e.default)((0,t.jsx)("path",{d:"M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z"}),"OpenInFull"),C}var pr=gr();const hr=J(pr),K=76,U=96,vr=()=>{var j,b,g;const{pipelineStatus:r,isCardVisible:e,isMinimized:t,closePipelineCard:n,toggleMinimize:p}=or(),I=["Ingestion","Retry","Extraction","Metrics","Alerts"],d=()=>r?{ingestion:0,reprocessing:1,extraction:2,metrics:3,alerts:4,completed:5}[r.current_step]??0:0,m=(r==null?void 0:r.status)==="completed",a=(r==null?void 0:r.status)==="failed",x=(r==null?void 0:r.status)==="skipped",i=m||a||x,u=m?"success":a?"error":x?"warning":"primary";return e?t?o.jsx(L,{elevation:8,sx:{position:"fixed",bottom:{xs:M(K),md:U},right:{xs:16,md:24},width:180,zIndex:s=>s.zIndex.drawer-1,borderRadius:3,overflow:"hidden",bgcolor:`${u}.main`,color:`${u}.contrastText`,cursor:"pointer",transition:"transform 0.2s, box-shadow 0.2s","&:hover":{transform:"scale(1.02)",boxShadow:12}},onClick:p,children:o.jsxs(l,{sx:{px:1.5,py:1,display:"flex",alignItems:"center",justifyContent:"space-between"},children:[o.jsxs(l,{display:"flex",alignItems:"center",gap:1,children:[!i&&o.jsx(O,{size:14,sx:{color:"inherit"}}),o.jsx(c,{variant:"caption",fontWeight:"bold",children:m?"Complete":a?"Failed":x?"Skipped":`Running ${((j=r==null?void 0:r.percent)==null?void 0:j.toFixed(0))||0}%`})]}),o.jsx(P,{size:"small",sx:{color:"inherit",p:.25},children:o.jsx(hr,{sx:{fontSize:14}})})]})}):o.jsxs(L,{elevation:8,sx:{position:"fixed",bottom:{xs:M(K),md:U},right:{xs:16,md:24},width:{xs:"calc(100% - 32px)",sm:380},zIndex:s=>s.zIndex.drawer-1,borderRadius:2,overflow:"hidden"},children:[o.jsxs(l,{sx:{px:2,py:1.5,bgcolor:`${u}.main`,color:`${u}.contrastText`,display:"flex",alignItems:"center",justifyContent:"space-between"},children:[o.jsxs(l,{display:"flex",alignItems:"center",children:[!i&&o.jsx(O,{size:16,sx:{color:"inherit",mr:1}}),o.jsx(c,{variant:"subtitle2",fontWeight:"bold",children:m?"Pipeline Complete":a?"Pipeline Failed":x?"Pipeline Skipped":"Running Pipeline..."})]}),o.jsxs(l,{display:"flex",alignItems:"center",gap:.5,children:[o.jsx(P,{size:"small",onClick:p,sx:{color:"inherit",p:.5},children:o.jsx(sr,{fontSize:"small"})}),i&&o.jsx(P,{size:"small",onClick:n,sx:{color:"inherit",p:.5},children:o.jsx(tr,{fontSize:"small"})})]})]}),o.jsxs(l,{sx:{p:2},children:[o.jsx(l,{display:"flex",justifyContent:"space-between",mb:1.5,children:I.map((s,h)=>o.jsxs(l,{sx:{display:"flex",flexDirection:"column",alignItems:"center",flex:1},children:[o.jsx(l,{sx:{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"bold",bgcolor:h<d()?"success.main":h===d()&&!i?"primary.main":"action.selected",color:h<d()?"success.contrastText":h===d()&&!i?"primary.contrastText":"text.secondary"},children:h<d()?"✓":h+1}),o.jsx(c,{variant:"caption",sx:{fontSize:"9px",mt:.5,color:"text.secondary"},children:s})]},s))}),o.jsx(br,{variant:"determinate",value:(r==null?void 0:r.percent)||0,color:m?"success":a?"error":x?"warning":"primary",sx:{height:6,borderRadius:3,mb:1}}),o.jsxs(c,{variant:"caption",color:"text.secondary",display:"block",textAlign:"center",children:[((b=r==null?void 0:r.percent)==null?void 0:b.toFixed(0))||0,"% - ",(r==null?void 0:r.message)||"Initializing..."]}),a&&o.jsx(w,{severity:"error",sx:{mt:1.5,py:.5},children:o.jsx(c,{variant:"caption",children:(r==null?void 0:r.error_message)||"Pipeline failed"})}),x&&o.jsx(w,{severity:"warning",sx:{mt:1.5,py:.5},children:o.jsx(c,{variant:"caption",children:(r==null?void 0:r.error_message)||"Pipeline skipped"})}),((r==null?void 0:r.ingestion_result)||(r==null?void 0:r.reprocessing_result)||(r==null?void 0:r.extraction_result)||(r==null?void 0:r.metrics_result))&&o.jsxs(l,{sx:{mt:1.5,pt:1.5,borderTop:1,borderColor:"divider"},children:[(r==null?void 0:r.ingestion_result)&&o.jsxs(c,{variant:"caption",color:"text.secondary",display:"block",children:["Ingested: ",r.ingestion_result.new_items||0," items from ",r.ingestion_result.total_sources||0," sources"]}),(r==null?void 0:r.reprocessing_result)&&o.jsxs(c,{variant:"caption",color:"text.secondary",display:"block",children:["Retried: ",r.reprocessing_result.reprocessed_count||0," failed,"," ",r.reprocessing_result.processed||0," recovered"]}),(r==null?void 0:r.extraction_result)&&o.jsxs(c,{variant:"caption",color:"text.secondary",display:"block",children:["Extracted: ",r.extraction_result.processed||0," processed, ",((g=r.extraction_result.new_themes)==null?void 0:g.length)||0," new themes"]}),(r==null?void 0:r.metrics_result)&&o.jsxs(c,{variant:"caption",color:"text.secondary",display:"block",children:["Metrics: ",r.metrics_result.themes_updated||0," themes updated"]})]})]})]}):null},_r=Object.freeze(Object.defineProperty({__proto__:null,default:vr},Symbol.toStringTag,{value:"Module"}));export{br as L,_r as P};
