var q=Object.defineProperty,ee=Object.defineProperties;var te=Object.getOwnPropertyDescriptors;var X=Object.getOwnPropertySymbols;var ae=Object.prototype.hasOwnProperty,ie=Object.prototype.propertyIsEnumerable;var Q=(t,o,s)=>o in t?q(t,o,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[o]=s,D=(t,o)=>{for(var s in o||(o={}))ae.call(o,s)&&Q(t,s,o[s]);if(X)for(var s of X(o))ie.call(o,s)&&Q(t,s,o[s]);return t},F=(t,o)=>ee(t,te(o));var Y=(t,o,s)=>new Promise((r,c)=>{var d=m=>{try{g(s.next(m))}catch(u){c(u)}},p=m=>{try{g(s.throw(m))}catch(u){c(u)}},g=m=>m.done?r(m.value):Promise.resolve(m.value).then(d,p);g((s=s.apply(t,o)).next())});import{p as j,z as e}from"./vendor-react-core-epku87Fy.js";import{k as re,r as ne,g as oe,aC as V,ak as se,K as le}from"./index-CAwBCYBZ.js";import"./vendor-state-e5U2a8Cz.js";import"./vendor-jspdf-DHr10pbJ.js";import"./vendor-supabase-D6h2Ap73.js";import"./vendor-math-markdown-Brb3gQL5.js";import"./vendor-charts-C3V2zGwb.js";import"./vendor-xlsx-Ccx-kdi7.js";const de=t=>{if(!t)return{id:String(Math.random()),questionText:"",questionType:"MULTIPLE_CHOICE"};const o=t.questionText||t.question_text||"",s=t.questionType||t.question_type||"MULTIPLE_CHOICE";let r=String(s).toUpperCase().trim();r==="MULTIPLE-CHOICE"&&(r="MULTIPLE_CHOICE"),r==="COMPLEX-MULTIPLE-CHOICE"&&(r="COMPLEX_MULTIPLE_CHOICE"),r==="TRUE-FALSE"&&(r="TRUE_FALSE"),r==="FILL-IN-THE-BLANK"&&(r="FILL_IN_THE_BLANK");const c=t.correctAnswer||t.correct_answer||"",d=t.options||t.choices||[],p=t.optionImages||t.option_images||[],g=t.optionCharts||t.option_charts||[],m=t.imageUrl||t.image_url||"",u=t.audioUrl||t.audio_url||"",f=t.category||"",E=t.level||"",T=typeof t.scoreWeight=="number"?t.scoreWeight:typeof t.score_weight=="number"?t.score_weight:1,I=t.kisiKisi||t.kisi_kisi||"";let x=t.matchingPairs||t.matching_pairs||[];x=x.map(y=>({left:y.left||"",right:y.right||"",leftChart:y.leftChart||y.left_chart,rightChart:y.rightChart||y.right_chart}));let A=t.trueFalseRows||t.true_false_rows||[];return A=A.map(y=>({text:y.text||"",answer:y.answer===!0||y.answer==="true"||y.answer==="Benar"||y.answer==="BENAR",chartData:y.chartData||y.chart_data})),{id:String(t.id||Math.random()),questionText:o,questionType:r,options:d,correctAnswer:c,imageUrl:m,audioUrl:u,optionImages:p,chartData:t.chartData||t.chart_data,optionCharts:g,correctAnswerChart:t.correctAnswerChart||t.correct_answer_chart,category:f,level:E,scoreWeight:T,kisiKisi:I,matchingPairs:x,trueFalseRows:A}},pe=t=>{const o=String(t.questionType||t.question_type||"").toUpperCase().trim(),s=t.options||t.choices||[],r=(t.correctAnswer||t.correct_answer||"").trim();if(o==="MULTIPLE_CHOICE"){const c=parseInt(r,10);if(!isNaN(c)&&s&&c>=0&&c<s.length)return String.fromCharCode(65+c);if(s&&s.length>0){const p=s.findIndex(g=>g&&g.trim()===r);if(p!==-1)return String.fromCharCode(65+p)}const d=r.toUpperCase();return d.length===1&&d>="A"&&d<="Z"?d:r.replace(/<[^>]*>/g,"").trim()||"-"}if(o==="COMPLEX_MULTIPLE_CHOICE"||o==="COMPLEX-MULTIPLE-CHOICE"){let c=[];if(r.startsWith("[")&&r.endsWith("]"))try{const p=JSON.parse(r);Array.isArray(p)?c=p.map(g=>String(g).trim()):c=[r]}catch(p){c=[r]}else c=r?r.split(/,\s*/):[];const d=[];return c.forEach(p=>{const g=p.trim(),m=parseInt(g,10);if(!isNaN(m)&&s&&m>=0&&m<s.length){d.push(String.fromCharCode(65+m));return}if(s&&s.length>0){const f=s.findIndex(E=>E&&E.trim()===g);if(f!==-1){d.push(String.fromCharCode(65+f));return}}const u=g.toUpperCase();if(u.length===1&&u>="A"&&u<="Z"){d.push(u);return}g&&d.push(g.replace(/<[^>]*>/g,"").trim())}),d.length>0?Array.from(new Set(d)).sort().join(", "):r.replace(/<[^>]*>/g,"").trim()||"-"}if(o==="TRUE_FALSE"||o==="TRUE-FALSE"){const c=t.trueFalseRows||t.true_false_rows||[],d=t.categoryLabels&&t.categoryLabels[0]||"Benar",p=t.categoryLabels&&t.categoryLabels[1]||"Salah",g=d.charAt(0).toUpperCase(),m=p.charAt(0).toUpperCase(),u=c.map(f=>f.answer===!0||String(f.answer).toLowerCase().trim()==="true"||String(f.answer).trim()==="1"||String(f.answer).toLowerCase().trim()===d.toLowerCase()||String(f.answer).trim()==="Benar"||String(f.answer).trim()==="BENAR"?g:m);return u.length>0?u.join(", "):"-"}return o==="MATCHING"?(t.matchingPairs||t.matching_pairs||[]).map(p=>{const g=(p.left||"").replace(/<[^>]*>/g,"").trim(),m=(p.right||"").replace(/<[^>]*>/g,"").trim();return`${g} ➔ ${m}`}).join(", ")||"-":r.replace(/<[^>]*>/g,"").trim()||"-"},ce=({selectedExams:t,bookTitle:o,bookSubtitle:s,fontSize:r,lineSpacing:c,paperMargin:d,keepTogether:p,styleTags:g})=>{let m=0,u="";const f=(i,h)=>{var k;let l=h||"";if(/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(l)&&(l=l.replace(/(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi,'<span class="chart-placeholder" data-chart="true"></span>')),i){m++;const a="pdf-chart-"+m,w=i;if(w.type==="venn"||w.type==="relation"||w.type==="cartesian"){const N="<div class='chart-wrapper font-sans text-xs bg-slate-50 p-4 border rounded' style='text-align: center; margin: 15px 0;'>[Diagram Matematika/Fisika: "+(w.title||w.type.toUpperCase())+"]</div>";l=l.includes("chart-placeholder")?l.replace(/<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,N):l+N}else{const N="<div class='chart-wrapper' style='height: 280px; width: 100%; max-width: 550px; margin: 15px auto;'><canvas id='"+a+"'></canvas></div>";l.includes("chart-placeholder")?l=l.replace(/<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,N):l.includes('data-chart="true"')||l.includes("data-chart='true'")?l=l.replace(/<[^>]+data-chart=['"]true['"][^>]*>.*?<\/[a-zA-Z0-9]+>/g,N):l=l+N;const n=JSON.stringify(w.labels||[]),_=JSON.stringify(((k=w.datasets)==null?void 0:k.map(R=>({label:R.label,data:R.data,backgroundColor:R.backgroundColor||"#0088FE",borderColor:R.borderColor||"#0088FE",borderWidth:1})))||[]);u+="try { new Chart(document.getElementById('"+a+"'), { type: '"+w.type+"', data: { labels: "+n+", datasets: "+_+` }, options: { responsive: true, maintainAspectRatio: false, animation: false } }); } catch(e) { console.error(e); }
`}}return l.replace(/<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,"")},E=i=>!i||i.length<=1?!1:i.every(h=>h?h.replace(/<[^>]*>/g,"").trim().length<=32:!0),T=i=>{if(!i)return!1;const h=(i.questionType||i.type||"").toString().trim().toUpperCase();return h==="INFO"||h==="KETERANGAN"||h==="INFORMASI"},I=i=>{if(!i)return"";const h=re(i);return ne(h)};let x="";t.forEach((i,h)=>{var k,a,w,N;const l=i.questions.filter(n=>!T(n)).length;x+='<div class="page-container-flow">',x+=`
            <div class="printable-item exam-header" style="page-break-after: avoid; break-after: avoid; margin-top: 6px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px;">
                    <div>
                        <p style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #475569; letter-spacing: 0.1em; margin: 0 0 2px 0;">
                            MODUL ${h+1} &bull; ${i.authorSchool||"UJIAN SEKOLAH / ASESMEN"}
                        </p>
                        <h2 style="margin: 0; font-size: 13pt; font-weight: 900; text-transform: uppercase; color: #000;">
                            ${(k=i.config)!=null&&k.examType?`${i.config.examType} - `:""}${((a=i.config)==null?void 0:a.subject)||"Mata Pelajaran"}
                        </h2>
                    </div>
                    <div style="text-align: right; font-size: 8.5pt; color: #334155; line-height: 1.35;">
                        <div><span style="font-weight: bold;">Kelas:</span> ${((w=i.config)==null?void 0:w.classLevel)||"-"} &bull; <span style="font-weight: bold;">Waktu:</span> ${(N=i.config)!=null&&N.timeLimit?`${i.config.timeLimit} Menit`:"-"}</div>
                        <div><span style="font-weight: bold;">Jumlah Soal:</span> ${l} Butir (${i.code})</div>
                    </div>
                </div>
            </div>
        `,i.questions.forEach((n,_)=>{var $,H,W;const R=T(n),G=i.questions.slice(0,_).filter(L=>!T(L)).length+1;let b=I(n.questionText||"");b=f(n.chartData,b);const v=r==="small"?"10pt":r==="large"?"12pt":"11pt",S=c==="tight"?"1.35":c==="relaxed"?"1.75":"1.5",C=r==="small"?"9.5pt":r==="large"?"11.5pt":"10.5pt";if(R){x+=`
            <div class="printable-item info-part avoid-break" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px;">
                <div class="html-content" style="font-size: ${v}; line-height: ${S}; color: #0f172a; text-align: justify;">
                    ${b}
                </div>
                ${n.imageUrl?`
                    <div style="margin-top: 8px; margin-bottom: 8px; max-width: 80%;">
                        <img src="${n.imageUrl}" style="max-height: 180px; object-fit: contain; display: block; border-radius: 4px; border: 1px solid #cbd5e1;" referrerPolicy="no-referrer" />
                    </div>
                `:""}
                ${n.audioUrl?`
                    <div style="margin-top: 6px; font-size: 8.5pt; color: #475569;">
                        <strong>[Audio Stimulus]:</strong> ${n.audioUrl}
                    </div>
                `:""}
            </div>
        `;return}if(x+=`
            <div class="printable-item question-part avoid-break" style="margin-bottom: 14px;">
                <div class="question-container bg-white text-black">
                    <div style="display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-weight: bold; font-size: ${v}; min-width: 22px; text-align: right; flex-shrink: 0; color: #000; margin-top: 1px; line-height: ${S}; select-none;">${G}.</span>
                        <div style="flex: 1; font-size: ${v}; line-height: ${S}; color: #0f172a;">
                            <div class="html-content" style="text-align: justify; margin-bottom: 4px;">${b}</div>
                            
                            ${n.imageUrl?`
                                <div style="margin-top: 8px; margin-bottom: 8px; max-width: 80%;">
                                    <img src="${n.imageUrl}" style="max-height: 180px; object-fit: contain; display: block; border-radius: 4px; border: 1px solid #cbd5e1;" referrerPolicy="no-referrer" />
                                </div>
                            `:""}

                            ${n.audioUrl?`
                                <div style="margin-top: 6px; font-size: 8.5pt; color: #475569;">
                                    <strong>[Audio]:</strong> ${n.audioUrl}
                                </div>
                            `:""}
                        </div>
                    </div>
                </div>
      `,n.questionType==="MULTIPLE_CHOICE"||n.questionType==="COMPLEX_MULTIPLE_CHOICE"){const L=n.questionType==="COMPLEX_MULTIPLE_CHOICE",M=E(n.options)?"display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; row-gap: 5px; margin-top: 6px; padding-left: 30px; margin-bottom: 12px;":"display: flex; flex-direction: column; gap: 5px; margin-top: 6px; padding-left: 30px; margin-bottom: 12px;";x+=`<div class="printable-item options-wrapper" style="${M}">`,($=n.options)==null||$.forEach((P,B)=>{let J=I(P||"");n.optionCharts&&n.optionCharts[B]&&(J=f(n.optionCharts[B],J));const Z=L?`<span style="font-weight: bold; border: 1.5px solid #000; border-radius: 3px; min-width: 20px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 8.5pt; background: #fff; margin-top: 1px; flex-shrink: 0; box-sizing: border-box;">${String.fromCharCode(65+B)}</span>`:`<span style="font-weight: bold; color: #000; flex-shrink: 0; min-width: 16px;">${String.fromCharCode(65+B)}.</span>`;x+=`
                <div class="printable-item option-item avoid-break" style="display: flex; gap: 8px; align-items: baseline; font-size: ${C}; line-height: 1.45;">
                    ${Z}
                    <div class="html-content option-content" style="flex: 1; word-wrap: break-word; overflow-wrap: break-word; color: #000;">
                        ${J}
                        ${n.optionImages&&n.optionImages[B]?`
                            <div style="margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; display: inline-block; background-color: white;">
                                <img src="${n.optionImages[B]}" style="max-height: 75px; object-fit: contain;" referrerPolicy="no-referrer" />
                            </div>
                        `:""}
                    </div>
                </div>
          `}),x+="</div>"}else if(n.questionType==="TRUE_FALSE"){const L=n.categoryLabels&&n.categoryLabels[0]||"Benar",O=n.categoryLabels&&n.categoryLabels[1]||"Salah";x+=`
            <div class="printable-item tf-part avoid-break" style="margin-top: 6px; margin-left: 30px; margin-bottom: 14px; width: calc(100% - 30px);">
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5pt;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold;">Pernyataan</th>
                            <th style="border: 1px solid #000; padding: 6px 8px; width: 80px; text-align: center; font-weight: bold;">${L}</th>
                            <th style="border: 1px solid #000; padding: 6px 8px; width: 80px; text-align: center; font-weight: bold;">${O}</th>
                        </tr>
                    </thead>
                    <tbody>
        `,(H=n.trueFalseRows)==null||H.forEach(M=>{let P=I(M.text||"");M.chartData&&(P=f(M.chartData,P)),x+=`
            <tr style="border-bottom: 1px solid #000;">
                <td class="html-content" style="border: 1px solid #000; padding: 6px 10px; font-weight: 500;">${P}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">
                    <div style="width: 15px; height: 15px; border: 1.5px solid #000; border-radius: 50%; margin: 0 auto;"></div>
                </td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">
                    <div style="width: 15px; height: 15px; border: 1.5px solid #000; border-radius: 50%; margin: 0 auto;"></div>
                </td>
            </tr>
          `}),x+=`
                    </tbody>
                </table>
            </div>
        `}else n.questionType==="MATCHING"?(x+=`
            <div class="printable-item match-part avoid-break" style="margin-top: 6px; margin-left: 30px; margin-bottom: 14px; width: calc(100% - 30px);">
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5pt;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold; width: 50%;">Pernyataan / Soal</th>
                            <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold; width: 50%;">Pasangan Jawaban</th>
                        </tr>
                    </thead>
                    <tbody>
        `,(W=n.matchingPairs)==null||W.forEach((L,O)=>{let M=I(L.left||"");L.leftChart&&(M=f(L.leftChart,M));let P=I(L.right||"");L.rightChart&&(P=f(L.rightChart,P)),x+=`
            <tr style="border-bottom: 1px solid #000;">
                <td class="html-content" style="border: 1px solid #000; padding: 6px 10px;">
                    <span style="font-weight: bold; margin-right: 4px;">(${O+1})</span>
                    ${M}
                </td>
                <td class="html-content" style="border: 1px solid #000; padding: 6px 10px;">
                    <span style="font-weight: bold; margin-right: 4px;">(${String.fromCharCode(65+O)})</span>
                    ${P}
                </td>
            </tr>
          `}),x+=`
                    </tbody>
                </table>
            </div>
        `):n.questionType==="FILL_IN_THE_BLANK"?x+=`
            <div style="margin-top: 6px; margin-left: 30px; margin-bottom: 12px; font-size: 10pt; font-style: italic; color: #334155;">
                Jawaban: ..........................................................................................................................................
            </div>
        `:n.questionType==="ESSAY"&&(x+=`
            <div class="printable-item essay-part avoid-break" style="margin-top: 6px; margin-left: 30px; margin-bottom: 14px; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background-color: #fafafa; width: calc(100% - 30px);">
                <p style="font-size: 8.5pt; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px 0;">Lembar Jawaban / Uraian:</p>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px;"></div>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px;"></div>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px;"></div>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px;"></div>
            </div>
        `);x+="</div>"}),x+="</div>"});const A=[],y=2;for(let i=0;i<t.length;i+=y)A.push(t.slice(i,i+y));let U="";A.forEach((i,h)=>{let l="";i.forEach(k=>{const a=t.findIndex(w=>w.code===k.code);l+=`
                <div style="margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #000; color: #fff; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; font-weight: 900; font-size: 12px;">${a+1}</div>
                        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0;">${k.config.subject||"Kisi-Kisi"}</h2>
                    </div>
                    
                    <div class="keys-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
            `,k.questions.forEach((w,N)=>{const n=pe(w);l+=`
                    <div style="font-size: 11px; display: flex; align-items: flex-start; gap: 6px; box-sizing: border-box;">
                        <span style="font-weight: 800; color: #64748b; min-width: 18px; text-align: right;">${N+1}.</span>
                        <span style="font-weight: 950; color: #0f172a; text-transform: uppercase; background-color: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 4px; flex: 1; text-align: center; display: inline-block; word-break: break-all; min-height: 18px;">${n}</span>
                    </div>
                `}),l+=`
                    </div>
                </div>
            `}),U+=`
            <div class="page-container">
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; width: 100%; box-sizing: border-box;">
                    <div style="text-align: center; padding-bottom: 8px; margin-bottom: 16px; border-bottom: 4px solid black;">
                        <p style="font-weight: 900; letter-spacing: 0.2em; font-size: 10px; color: #dc2626; text-transform: uppercase; margin: 0 0 4px 0;">DOKUMEN SANGAT RAHASIA</p>
                        <h1 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0;">KUNCI JAWABAN RESMI</h1>
                        <p style="font-size: 10px; text-transform: uppercase; font-weight: bold; margin: 4px 0 0 0; color: #64748b;">Halaman ${h+1} dari ${A.length}</p>
                    </div>
                    ${l}
                </div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; margin-top: auto; width: 100%;">
                    <div style="font-weight: bold; text-transform: uppercase;">KUNCI JAWABAN RESMI</div>
                    <div style="font-weight: 900; letter-spacing: 0.1em;">DOKUMEN NEGARA - RAHASIA</div>
                </div>
            </div>
        `});let K="";t.forEach((i,h)=>{let l="";i.questions.forEach((k,a)=>{l+=`
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${a+1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${k.kisiKisi||"-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${k.category||"-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${k.level||"-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; text-transform: capitalize;">${k.questionType.replace(/_/g," ").toLowerCase()}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${k.scoreWeight||1}</td>
        </tr>
      `}),K+=`
      <div class="page-container-flow" style="page-break-after: always; break-after: page; display: flex; flex-direction: column; min-height: calc(296.5mm - (${d==="thin"?"15mm":d==="thick"?"25mm":"20mm"} * 2));">
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; width: 100%; box-sizing: border-box;">
            <div style="text-align: center; padding-bottom: 8px; margin-bottom: 16px; border-bottom: 4px solid black;">
                <p style="font-weight: 900; letter-spacing: 0.2em; font-size: 10px; color: #475569; text-transform: uppercase; margin: 0 0 4px 0;">LAMPIRAN DOKUMEN</p>
                <h1 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0;">KISI-KISI MATERI SOAL</h1>
                <p style="font-size: 10px; text-transform: uppercase; font-weight: bold; margin: 4px 0 0 0; color: #64748b;">MODUL ${h+1}: ${i.config.subject||"UMUM"}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: 'Inter', sans-serif; margin-bottom: 24px;">
                <thead>
                    <tr style="background-color: #f1f5f9; color: #0f172a;">
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 5%;">No</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 40%;">Materi / Kisi-Kisi</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 20%;">Kategori</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 10%;">Level</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 15%;">Jenis Soal</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 10%;">Bobot</th>
                    </tr>
                </thead>
                <tbody style="color: #334155;">
                    ${l}
                </tbody>
            </table>
        </div>
        <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; margin-top: auto; width: 100%;">
            <div style="font-weight: bold; text-transform: uppercase;">KISI-KISI MATERI SOAL</div>
            <div style="font-weight: 900; letter-spacing: 0.1em;">PLATFORM UJIAN CERDAS</div>
        </div>
      </div>
    `});const z=d==="thin"?"15mm":d==="thick"?"25mm":"20mm";return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>${o} - Platform Ujian Cerdas</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.css">
        ${g}
        <style>
            @page {
                size: A4 portrait !important;
                margin: ${z} !important;
            }
            @media print {
                body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body, .book-canvas, .book-canvas * {
                    visibility: visible !important;
                }
                .no-print {
                    display: none !important;
                }
                .page-break {
                    display: none !important;
                }
                .avoid-break {
                    page-break-inside: ${p==="never"?"auto":"avoid"} !important;
                    break-inside: ${p==="never"?"auto":"avoid"} !important;
                }
                .book-canvas {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    background: white !important;
                }
                .page-container {
                    width: 100% !important;
                    height: calc(297mm - (${z} * 2)) !important;
                    min-height: calc(297mm - (${z} * 2)) !important;
                    max-height: calc(297mm - (${z} * 2)) !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                .page-cover {
                    width: 100% !important;
                    height: calc(297mm - (${z} * 2)) !important;
                    min-height: calc(297mm - (${z} * 2)) !important;
                    max-height: calc(297mm - (${z} * 2)) !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                    border: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                }
                .page-frame-box {
                    border: 6px double #000000 !important;
                    padding: 8mm !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    max-height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                }
                .page-container-flow {
                    width: 100% !important;
                    min-height: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    page-break-after: always !important;
                    break-after: page !important;
                }
                .keys-grid {
                    grid-template-columns: repeat(5, 1fr) !important;
                }
            }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f1f5f9;
                color: #0f172a;
                margin: 0;
                padding: 30px 0;
                orphans: 3;
                widows: 3;
            }
            .book-canvas {
                background-color: white;
                width: 210mm;
                margin: 0 auto;
                box-sizing: border-box;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
            }
            .page-container {
                position: relative;
                width: 210mm;
                height: auto;
                min-height: 297mm;
                padding: ${z};
                box-sizing: border-box;
                background: white;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
                break-after: page;
            }
            .page-cover {
                position: relative;
                width: 210mm;
                height: 297mm;
                min-height: 297mm;
                max-height: 297mm;
                padding: ${z};
                box-sizing: border-box;
                background: white;
                display: flex;
                flex-direction: column;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
            }
            .page-frame-box {
                border: 6px double #000000;
                padding: 8mm;
                box-sizing: border-box;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .page-container-flow {
                position: relative;
                width: 210mm;
                min-height: 297mm;
                padding: ${z};
                box-sizing: border-box;
                background: white;
                page-break-after: always;
                break-after: page;
            }
            .page-break {
                display: none !important;
            }
            .avoid-break {
                page-break-inside: ${p==="never"?"auto":"avoid"};
                break-inside: ${p==="never"?"auto":"avoid"};
            }
            .chart-wrapper {
                width: 100%;
                max-width: 550px;
                margin: 15px auto;
                page-break-inside: avoid;
                text-align: center;
            }
            img {
                max-width: 100%;
                height: auto;
                object-fit: contain;
                border-radius: 4px;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 10px 0;
            }
            table, th, td {
                border: 1px solid #cbd5e1;
                padding: 8px;
            }
            .option-item .option-content p {
                display: inline;
                margin: 0 !important;
            }
            .math-visual {
                font-size: 1em !important;
                vertical-align: baseline !important;
                line-height: normal !important;
            }
            .katex {
                font-size: 1.10em !important;
                line-height: 1.2 !important;
                text-indent: 0 !important;
            }
            .katex .katex {
                font-size: 1em !important;
            }
            .katex .msupsub .katex-sizing.reset-size6.size3,
            .katex .msupsub .sizing.reset-size6.size3,
            .katex .op-limits .katex-sizing.reset-size6.size3,
            .katex .op-limits .sizing.reset-size6.size3,
            .katex .katex-sizing.reset-size6.size3,
            .katex .sizing.reset-size6.size3 {
                font-size: 0.68em !important;
            }
            .katex .msupsub .katex-sizing.reset-size6.size1,
            .katex .msupsub .sizing.reset-size6.size1,
            .katex .op-limits .katex-sizing.reset-size6.size1,
            .katex .op-limits .sizing.reset-size6.size1,
            .katex .sqrt .root .katex-sizing.reset-size6.size3,
            .katex .sqrt .root .sizing.reset-size6.size3,
            .katex .sqrt .root .katex-sizing.reset-size6.size1,
            .katex .sqrt .root .sizing.reset-size6.size1,
            .katex .katex-sizing.reset-size6.size1,
            .katex .sizing.reset-size6.size1 {
                font-size: 0.54em !important;
            }
            .katex * {
                text-indent: 0 !important;
            }
        </style>
    </head>
    <body>
        <div class="book-canvas">
            <!-- Cover Page -->
            <div class="page-container page-cover" style="page-break-after: always; break-after: page;">
                <div class="page-frame-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid black; padding-bottom: 10px;">
                        <div style="border: 2px solid black; padding: 5px 12px; font-size: 11px; font-weight: 800; display: inline-block; background-color: white; line-height: 1; text-transform: uppercase;">DOKUMEN NEGARA</div>
                        <div style="text-align: center;">
                            <p style="font-family: serif; font-weight: bold; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 2px 0;">REPUBLIK INDONESIA</p>
                            <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.06em;">PLATFORM UJIAN CERDAS</p>
                        </div>
                        <div style="border: 2px solid black; padding: 5px 12px; font-size: 11px; font-weight: 800; font-style: italic; display: inline-block; background-color: white; line-height: 1; text-transform: uppercase;">SANGAT RAHASIA</div>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0; padding: 16px 0;">
                        <div style="display: flex; justify-content: center; margin-bottom: 20px; width: 100%;">
                            <div style="width: 88px; height: 88px; padding: 10px; border: 3px solid black; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; background-color: white;">
                                <div style="box-sizing: border-box; width: 62px; height: 62px; border: 2px dashed black; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                    <span style="font-family: serif; font-size: 22px; font-weight: 900; letter-spacing: -0.05em; line-height: 1.1; margin: 0;">BSR</span>
                                    <span style="font-size: 6.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.1; margin: 2px 0 0 0;">SOAL RESMI</span>
                                </div>
                            </div>
                        </div>

                        <h1 style="font-family: serif; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; line-height: 1.25; max-width: 580px; margin: 0 0 10px 0; color: black; text-align: center;">
                            ${o}
                        </h1>
                        <p style="font-size: 12.5px; font-weight: bold; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 20px 0; text-align: center;">
                            ${s}
                        </p>

                        <div style="width: 100%; max-width: 480px; border: 3px double black; padding: 14px 18px; background-color: white; text-align: left; box-sizing: border-box;">
                            <p style="text-align: center; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 10.5px; border-bottom: 2px solid black; padding-bottom: 6px; margin: 0 0 10px 0;">IDENTITAS KUMPULAN SOAL</p>
                            <table style="width: 100%; font-size: 11.5px; border: none; border-collapse: collapse;">
                                <tr style="border: none;">
                                    <td style="border: none; padding: 4px 0; width: 130px; text-transform: uppercase; color: #64748b; font-weight: bold;">Jenis Dokumen</td>
                                    <td style="border: none; padding: 4px; width: 10px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold; text-transform: uppercase;">Buku Kumpulan Soal Resmi (BSR)</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Modul</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${t.length} Modul Kisi-Kisi</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Soal</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${t.reduce((i,h)=>i+h.questions.length,0)} Butir Soal</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Tahun Pelajaran</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${new Date().getFullYear()} / ${new Date().getFullYear()+1}</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 5px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Hak Akses</td>
                                    <td style="border: none; padding: 5px;">:</td>
                                    <td style="border: none; padding: 5px 0;"><span style="font-weight: 800; font-size: 9.5px; padding: 3px 8px; border: 1px solid black; background-color: #f8fafc; display: inline-block;">GURU / PENGAWAS</span></td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #000; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt;">
                        <p style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; color: #334155;">PLATFORM UJIAN CERDAS INDONESIA</p>
                        <p style="font-weight: 600; margin: 0; color: #64748b;">Dicetak: ${new Date().toLocaleDateString("id-ID",{year:"numeric",month:"long",day:"numeric"})}</p>
                    </div>
                </div>
            </div>

            <!-- Petunjuk Umum Page -->
            <div class="page-container page-cover" style="page-break-after: always; break-after: page;">
                <div class="page-frame-box">
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
                        <div style="border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 16px; text-align: center;">
                            <h2 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">PETUNJUK UMUM</h2>
                            <p style="font-size: 9.5px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin: 3px 0 0 0;">PEDOMAN PELAKSANAAN UJIAN & EVALUASI BELAJAR</p>
                        </div>
                        <div style="font-size: 11.5px; line-height: 1.55; text-align: justify; color: #1e293b;">
                            <p style="font-weight: bold; color: #0f172a; margin-bottom: 10px;">Sebelum menguji atau membagikan naskah soal di dalam buku ini, mohon perhatikan pedoman penting berikut:</p>
                            <ol style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px; margin: 0;">
                                <li><strong>Pembacaan Doa:</strong> Awali pelaksanaan kegiatan belajar, evaluasi, ataupun pengujian dengan berdoa bersama demi kelancaran dan kesuksesan bersama.</li>
                                <li><strong>Verifikasi Modul:</strong> Periksa kesesuaian dan kelengkapan butir soal seluruh modul materi (${t.length} Modul) sebelum didistribusikan kepada peserta didik.</li>
                                <li><strong>Pilihan Ganda:</strong> Pilihlah satu jawaban yang paling tepat dengan menyilang atau menghitamkan huruf A, B, C, D, atau E. Opsi berkarakter pendek telah disusun rapi dalam 2 kolom untuk efisiensi ruang dan keterbacaan optimal.</li>
                                <li><strong>Pilihan Ganda Kompleks:</strong> Pilihan ganda kompleks mengizinkan siswa memilih lebih dari satu jawaban yang benar dengan memberi tanda centang/silang pada kotak opsi [A], [B], [C], [D] yang sesuai.</li>
                                <li><strong>Soal Benar-Salah:</strong> Untuk soal berpola Benar atau Salah, berikan tanda silang atau centang pada lingkaran pilihan tabel pernyataan yang tersedia.</li>
                                <li><strong>Soal Menjodohkan:</strong> Pasangkan nomor pernyataan di kolom sebelah kiri dengan huruf pilihan jawaban di kolom sebelah kanan yang merupakan pasangan tepat.</li>
                                <li><strong>Soal Isian Singkat:</strong> Tuliskan jawaban singkat, lugas, dan terarah pada baris titik-titik yang disediakan.</li>
                                <li><strong>Soal Uraian / Esai:</strong> Gunakan lembar garis pengerjaan di bawah butir soal esai untuk menjabarkan rincian rumus, hitungan, atau argumen tulisan tangan secara rapi.</li>
                                <li><strong>Kunci Jawaban Resmi:</strong> Kunci jawaban resmi terlampir pada halaman penutup dokumen ini. Pisahkan lembar kunci jawaban sebelum naskah dibagikan kepada peserta ujian.</li>
                                <li><strong>Kisi-Kisi Materi:</strong> Lampiran kisi-kisi dan level kognitif terlampir di lembar akhir untuk keperluan arsip penilaian dan rekapitulasi guru.</li>
                            </ol>
                        </div>
                    </div>
                    
                    <div style="margin-top: 16px;">
                        <div style="border-top: 2px solid #000; padding-top: 8px; text-align: center; font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase;">PRESTASI PENTING &bull; JUJUR YANG UTAMA</div>
                    </div>
                </div>
            </div>

            <!-- Materi Soal Ujian -->
            ${x}

            <!-- Kunci Jawaban Page -->
            ${U}

            <!-- Kisi Kisi Page -->
            ${K}
        </div>

        <script src="https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.js"><\/script>
        <script>
            ${u}
        <\/script>
        <script>
            const checkAndRun = () => {
                const images = Array.from(document.images);
                const isLoaded = images.every(img => img.complete);
                if (!isLoaded) {
                    setTimeout(checkAndRun, 100);
                    return;
                }
                
                if (window.katex) {
                    document.querySelectorAll('.math-visual[data-latex]').forEach(el => {
                        try {
                            const latex = el.getAttribute('data-latex');
                            if (latex && (!el.querySelector('.katex') || el.innerHTML.trim() === '')) {
                                const isBlock = el.style.display === 'block';
                                el.innerHTML = window.katex.renderToString(latex, {
                                    throwOnError: false,
                                    displayMode: isBlock
                                });
                            }
                        } catch (e) {
                            console.error('KaTeX error:', e);
                        }
                    });
                }
                
                setTimeout(() => {
                    window.print();
                }, 500);
            };
            setTimeout(checkAndRun, 500);
        <\/script>
    </body>
    </html>
    `},ge=({profile:t})=>{const[o,s]=j.useState([]),[r,c]=j.useState([]),[d,p]=j.useState(!0),[g,m]=j.useState(!1),[u,f]=j.useState(""),[E,T]=j.useState("idle"),[I,x]=j.useState(""),[A,y]=j.useState("Buku Kumpulan Soal Resmi"),[U,K]=j.useState("Disusun oleh Super Admin"),[z,i]=j.useState("normal"),[h,l]=j.useState("normal"),[k,a]=j.useState("normal"),[w,N]=j.useState("auto");j.useEffect(()=>{Y(void 0,null,function*(){p(!0);try{const v=yield oe.getExams(t,{includeQuestions:!0}),S=Object.values(v).map(C=>({exam:C,subject:C.config.subject,examType:C.config.examType||"",school:C.authorSchool||"",count:C.questions.length,code:C.code}));s(S)}catch(v){console.error("Gagal memuat ujian:",v)}p(!1)})},[t]);const n=j.useMemo(()=>{const b=u.toLowerCase();return o.filter(v=>{var S,C,$,H;return(((S=v.subject)==null?void 0:S.toLowerCase())||"").includes(b)||(((C=v.examType)==null?void 0:C.toLowerCase())||"").includes(b)||((($=v.school)==null?void 0:$.toLowerCase())||"").includes(b)||(((H=v.code)==null?void 0:H.toLowerCase())||"").includes(b)})},[o,u]),_=j.useCallback(b=>{if(r.find(S=>S.code===b.code))return;const v=D({},b.exam);v.questions&&(v.questions=v.questions.map(S=>de(S))),c(S=>[...S,v])},[r]),R=j.useCallback(b=>{c(v=>v.filter(S=>S.code!==b))},[]),G=j.useCallback(()=>{m(!0),T("generating");try{const b=window.open("","_blank");if(!b)throw new Error("Pop-up blocker mencegah pembukaan tab baru. Mohon izinkan pop-up untuk situs ini.");const v=Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(C=>{if(C.tagName==="LINK")return`<link rel="stylesheet" href="${C.href}">`;let $=C.innerHTML||"";return($.includes("visibility: hidden")||$.includes("visibility:hidden"))&&($=$.replace(/body\s*\*\s*\{\s*visibility:\s*hidden\s*(!important)?\s*;?\s*\}/g,"/* stripped hiding rule */")),`<style>${$}</style>`}).join(`
`),S=ce({selectedExams:r,bookTitle:A,bookSubtitle:U,fontSize:z,lineSpacing:h,paperMargin:k,keepTogether:w,styleTags:v});b.document.open(),b.document.write(S),b.document.close(),T("success")}catch(b){console.error("Gagal memproses dokumen cetak buku:",b),T("error"),x(b instanceof Error?b.message:String(b))}finally{m(!1)}},[r,A,U,z,h,k,w]);return{exams:o,selectedExams:r,isLoading:d,isPrinting:g,searchTerm:u,printStatus:E,printErrorMsg:I,bookTitle:A,bookSubtitle:U,fontSize:z,lineSpacing:h,paperMargin:k,keepTogether:w,setSearchTerm:f,setBookTitle:y,setBookSubtitle:K,setFontSize:i,setLineSpacing:l,setPaperMargin:a,setKeepTogether:N,filteredExams:n,handleSelect:_,handleDeselect:R,handleDownload:G}},me=t=>e.jsx("svg",F(D({},t),{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M6.728 9.75h10.544c.905 0 1.637.732 1.637 1.637v4.09c0 .905-.732 1.637-1.637 1.637H6.728a1.637 1.637 0 01-1.637-1.637v-4.09c0-.905-1.637-1.637 1.637-1.637zM6.75 3.75h10.5a.75.75 0 01.75.75v5.25H6v-5.25a.75.75 0 01.75-.75zM16.5 17.25v2.25a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75v-2.25h9z"})})),xe=t=>e.jsx("svg",F(D({},t),{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"})})),be=t=>e.jsx("svg",F(D({},t),{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"})})),ze=({profile:t})=>{j.useEffect(()=>{V(document);const a=setTimeout(()=>V(document),200);return()=>clearTimeout(a)},[]);const{selectedExams:o,isLoading:s,isPrinting:r,searchTerm:c,printStatus:d,printErrorMsg:p,bookTitle:g,bookSubtitle:m,fontSize:u,lineSpacing:f,paperMargin:E,keepTogether:T,setSearchTerm:I,setBookTitle:x,setBookSubtitle:A,setFontSize:y,setLineSpacing:U,setPaperMargin:K,setKeepTogether:z,filteredExams:i,handleSelect:h,handleDeselect:l,handleDownload:k}=ge({profile:t});return s?e.jsx("div",{className:"p-8 text-center text-slate-500",children:"Memuat data soal..."}):e.jsx("div",{className:"p-4 sm:p-8",children:e.jsxs("div",{className:"print:hidden",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-6",children:[e.jsx(se,{className:"w-8 h-8 text-indigo-600 dark:text-indigo-400"}),e.jsx("h2",{className:"text-2xl font-bold text-slate-800 dark:text-white",children:"Generator Buku Soal"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-8",children:[e.jsxs("div",{className:"bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-800",children:[e.jsx("h3",{className:"font-bold text-lg mb-4 text-slate-800 dark:text-white",children:"Pilih Sumber Soal"}),e.jsxs("div",{className:"relative mb-4",children:[e.jsx(le,{className:"w-5 h-5 absolute left-3 top-2.5 text-slate-400"}),e.jsx("input",{type:"text",placeholder:"Cari pelajaran, sekolah, atau tipe...",value:c,onChange:a=>I(a.target.value),className:"w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"})]}),e.jsxs("div",{className:"overflow-y-auto h-[400px] space-y-2 pr-2 custom-scrollbar relative",children:[i.map(a=>e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl transition-all hover:border-indigo-300 dark:hover:border-indigo-500/50",children:[e.jsxs("div",{className:"min-w-0 pr-3",children:[e.jsxs("p",{className:"font-bold text-slate-800 dark:text-slate-200 truncate",children:[a.subject," ",a.examType?`- ${a.examType}`:""]}),e.jsxs("p",{className:"text-xs text-slate-500 dark:text-slate-400 truncate",children:[a.school||"Sekolah Tidak Diketahui"," • ",a.count," ","Soal"]}),e.jsx("p",{className:"text-[10px] font-mono text-slate-400 mt-1",children:a.code})]}),e.jsx("button",{onClick:()=>h(a),disabled:!!o.find(w=>w.code===a.code),className:"p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0",children:e.jsx(xe,{className:"w-5 h-5"})})]},a.code)),i.length===0&&e.jsx("div",{className:"text-center p-8 text-slate-500 text-sm",children:"Tidak ada ujian ditemukan."})]})]}),e.jsxs("div",{className:"bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-800 flex flex-col min-h-[660px]",children:[e.jsx("h3",{className:"font-bold text-lg mb-4 text-slate-800 dark:text-white",children:"Pengaturan Buku"}),e.jsxs("div",{className:"space-y-4 mb-4 shrink-0",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-slate-500 uppercase mb-1",children:"Judul Buku"}),e.jsx("input",{type:"text",value:g,onChange:a=>x(a.target.value),className:"w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-slate-500 uppercase mb-1",children:"Sub Judul / Keterangan"}),e.jsx("input",{type:"text",value:m,onChange:a=>A(a.target.value),className:"w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"})]})]}),e.jsxs("div",{className:"bg-indigo-50/20 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shrink-0",children:[e.jsxs("p",{className:"text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5",children:[e.jsx("span",{children:"⚙️"})," Pengaturan Tata Letak & Toleransi Cetak"]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 text-xs",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1",children:"Ukuran Huruf"}),e.jsxs("select",{value:u,onChange:a=>y(a.target.value),className:"w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none",children:[e.jsx("option",{value:"small",children:"Kecil (10.5pt)"}),e.jsx("option",{value:"normal",children:"Sedang (11.5pt)"}),e.jsx("option",{value:"large",children:"Besar (12.5pt)"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1",children:"Jarak Baris"}),e.jsxs("select",{value:f,onChange:a=>U(a.target.value),className:"w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none",children:[e.jsx("option",{value:"tight",children:"Rapat (1.35)"}),e.jsx("option",{value:"normal",children:"Sedang (1.55)"}),e.jsx("option",{value:"relaxed",children:"Longgar (1.80)"})]})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 text-xs",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1",children:"Margin Halaman"}),e.jsxs("select",{value:E,onChange:a=>K(a.target.value),className:"w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none",children:[e.jsx("option",{value:"thin",children:"Tipis (15mm)"}),e.jsx("option",{value:"normal",children:"Sedang (20mm)"}),e.jsx("option",{value:"thick",children:"Tebal (25mm)"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1",children:"Pemisahan Halaman"}),e.jsxs("select",{value:T,onChange:a=>z(a.target.value),className:"w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none",children:[e.jsx("option",{value:"auto",children:"Auto Repair (Saran)"}),e.jsx("option",{value:"always",children:"Selalu Utuh"}),e.jsx("option",{value:"never",children:"Bebas Terpotong"})]})]})]}),e.jsxs("p",{className:"text-[9px] text-slate-400 dark:text-slate-500 leading-normal",children:["*Pemisahan ",e.jsx("strong",{children:"Auto Repair"})," mencegah soal pendek terputus, namun mengizinkan soal panjang / tabel terpecah agar bagian bawah kertas tidak kosong atau meluap."]})]})]}),e.jsx("div",{className:"flex items-center justify-between mb-2",children:e.jsxs("h4",{className:"font-bold text-sm text-slate-700 dark:text-slate-300",children:["Soal Terpilih (",o.length,")"]})}),e.jsxs("div",{className:"flex-1 overflow-y-auto space-y-2 pr-2 mb-4 custom-scrollbar min-h-[140px]",children:[o.map(a=>e.jsxs("div",{className:"flex items-center justify-between p-2 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg group",children:[e.jsxs("div",{className:"min-w-0 pr-2",children:[e.jsx("p",{className:"font-bold text-sm text-slate-800 dark:text-slate-200 truncate",children:a.config.subject}),e.jsxs("p",{className:"text-[11px] text-slate-500 dark:text-slate-400 truncate",children:[a.questions.length," Soal • ",a.code]})]}),e.jsx("button",{onClick:()=>l(a.code),className:"p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-md transition-colors opacity-80 group-hover:opacity-100 shrink-0",title:"Hapus dari buku",children:e.jsx(be,{className:"w-5 h-5"})})]},a.code)),o.length===0&&e.jsxs("div",{className:"text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-sm font-medium",children:["Belum ada soal terpilih.",e.jsx("br",{}),e.jsx("span",{className:"text-xs font-normal",children:"Pilih ujian dari panel sebelah kiri."})]})]}),d==="error"&&e.jsx("div",{className:"mb-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 rounded-lg text-xs text-rose-600 dark:text-rose-400",children:p||"Gagal membuat dokumen."}),e.jsxs("button",{onClick:k,disabled:o.length===0||r,className:"w-full shrink-0 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",children:[r?e.jsx("div",{className:"w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"}):e.jsx(me,{className:"w-5 h-5"}),e.jsx("span",{children:r?"Menyiapkan Unduhan...":"Unduh PDF Buku"})]})]})]})]})})};export{ze as BookGeneratorView,ze as default};
