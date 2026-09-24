(function () {
  'use strict';
  const mount = document.getElementById('network-doctor');
  const D = window.NetworkDoctor;
  if (!mount || !D) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  let snapshot = null;
  let busy = false;

  mount.innerHTML = `
  <section class="dr-hero"><div class="dr-topline"><span class="dr-eyebrow">MIKROTOOLS / NETWORK DOCTOR</span><span class="dr-pill">RouterOS 6 + 7 · قراءة فقط</span></div><h1>دكتور الشبكة<span aria-hidden="true">.</span></h1><p>افهم اللي بيحصل في شبكتك. فحص مترابط للراوتر والخدمات والسجلات، مع أدلة واضحة وخطوات عملية للحل.</p><div class="dr-actions"><button type="button" id="dr-demo">استكشف تجربة تفاعلية ←</button><span class="dr-subtle">تشخيص قائم على بيانات الفحص</span></div></section>
  <div id="dr-demo-banner" class="dr-demo-banner" hidden>وضع تجريبي — جميع البيانات التالية توضيحية وليست من شبكتك.</div>
  <div class="dr-layout"><aside>
    <section class="dr-card"><h2>اكتب بيانات الراوتر</h2><p class="dr-subtle">IP واسم المستخدم وكلمة المرور، ثم يبدأ التحليل مباشرة.</p><form id="dr-connect"><label class="dr-field">عنوان IP للراوتر<input name="host" placeholder="192.168.88.1" required maxlength="45" autocomplete="off"></label><label class="dr-field">اسم المستخدم<input name="username" placeholder="network-doctor" required maxlength="128" autocomplete="username"></label><label class="dr-field">كلمة المرور<input name="password" type="password" required maxlength="256" autocomplete="current-password"></label><button class="dr-primary dr-full" id="dr-scan" type="submit">حلّل الراوتر الآن ←</button></form><p class="dr-note"><i class="fas fa-lock" aria-hidden="true"></i> الفحص الفعلي متاح بباسورد الاشتراك، وبيانات دخول الراوتر لا تُحفظ.</p><div id="dr-status" class="dr-status" role="status" aria-live="polite">جاهز للاتصال المباشر</div></section>
    <section class="dr-card dr-guide"><h3>قبل الفحص</h3><ol><li>فعّل خدمة <bdi>API</bdi> على المنفذ <bdi>8728</bdi>.</li><li>اسمح لعنوان اللاب بالوصول للخدمة.</li><li>استخدم حسابًا مخصصًا بصلاحيات <bdi>read,api</bdi> فقط.</li></ol><p class="dr-subtle">الفحص للقراءة فقط ولا ينفذ أي تعديل على إعدادات الراوتر.</p></section>
  </aside><div><div class="dr-metrics" id="dr-metrics"></div>
    <section class="dr-card"><div class="dr-heading"><div><h2 id="dr-title">صورة أوضح لشبكتك</h2><span class="dr-subtle" id="dr-time">ابدأ فحصًا أو استكشف المثال التفاعلي</span></div><button id="dr-export" disabled>تصدير التقرير ↓</button></div><div id="dr-findings"><div class="dr-empty"><div class="dr-cross">+</div><h3>كل تنبيه له دليل. وكل خطوة لها سبب.</h3><p class="dr-subtle">موارد الجهاز · التوجيه · العملاء · الحماية · السجلات</p></div></div></section>
    <section class="dr-card"><h2>تغطية الفحص</h2><p class="dr-subtle">غياب البيانات لا يعني أن الخدمة سليمة.</p><div id="dr-coverage" class="dr-coverage"></div></section>
    <section class="dr-card" id="dr-details" hidden><div class="dr-tabs" role="tablist" aria-label="تفاصيل الشبكة"><button role="tab" aria-selected="true" id="dr-tab-traffic" aria-controls="dr-traffic">تحليل الترافيك</button><button role="tab" aria-selected="false" id="dr-tab-interfaces" aria-controls="dr-interfaces">واجهات الشبكة</button><button role="tab" aria-selected="false" id="dr-tab-logs" aria-controls="dr-logs">السجلات</button></div><div id="dr-traffic" role="tabpanel" aria-labelledby="dr-tab-traffic"></div><div id="dr-interfaces" class="dr-scroll" hidden role="tabpanel" aria-labelledby="dr-tab-interfaces"></div><div id="dr-logs" hidden role="tabpanel" aria-labelledby="dr-tab-logs"><label class="dr-field">البحث في السجلات<input id="dr-search" placeholder="IP أو رسالة أو نوع الحدث"></label><div id="dr-log-table" class="dr-scroll"></div></div></section>
  </div></div><p class="dr-footer">MikroTools Network Doctor · تشخيص واضح، وقرارات مبنية على الأدلة.</p>`;

  const $ = id => document.getElementById(id);
  const status = (message, error = false) => { $('dr-status').textContent = message; $('dr-status').dataset.error = String(error); };
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const humanRate = value => { const n=number(value),units=['bps','Kbps','Mbps','Gbps']; let i=0,v=n; while(v>=1000&&i<units.length-1){v/=1000;i++;} return (v>=100||i===0?Math.round(v):v.toFixed(1))+' '+units[i]; };
  const humanBytes = value => { const n=number(value),units=['B','KB','MB','GB','TB']; let i=0,v=n; while(v>=1024&&i<units.length-1){v/=1024;i++;} return (v>=100||i===0?Math.round(v):v.toFixed(1))+' '+units[i]; };
  const clientIp = value => { const match=String(value||'').match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/); return match?match[1]:''; };
  const privateIp = ip => /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip);

  function metrics(report) {
    const sections = snapshot?.sections || {};
    const count = key => sections[key] && sections[key].status !== 'unavailable' ? (sections[key].status === 'partial' ? '≥ ' : '') + sections[key].rows.length : '—';
    const cards = [['استهلاك المعالج',Number.isFinite(report?.cpu)?report.cpu+'%':'—',report?.cpu],['أعلى ترافيك لحظي',report?humanRate(report.peakTraffic):'—'],['الاتصالات النشطة',report?report.connections:'—'],['أقسام مكتملة',report?report.complete+' / '+Object.keys(D.names).length:'—']];
    $('dr-metrics').innerHTML = cards.map(([label,value,bar]) => `<article class="dr-metric"><span>${label}</span><strong>${esc(value)}</strong>${Number.isFinite(bar)?`<div class="dr-bar"><i style="width:${Math.min(100,Math.max(0,bar))}%"></i></div>`:'<span>حسب آخر فحص</span>'}</article>`).join('');
  }
  function table(head, rows) { return rows.length ? `<table><thead><tr>${head.map(value=>'<th>'+esc(value)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(value=>'<td class="dr-log-message">'+esc(value)+'</td>').join('')+'</tr>').join('')}</tbody></table>` : '<p class="dr-subtle">لا توجد بيانات متاحة لهذا العرض.</p>'; }
  function logs() { const query=$('dr-search').value.toLowerCase(); const rows=(snapshot?.sections.logs?.rows||[]).filter(row=>Object.values(row).join(' ').toLowerCase().includes(query)); $('dr-log-table').innerHTML=table(['الوقت','النوع','الرسالة'],rows.map(row=>[row.time,row.topics,row.message])); }
  function traffic() {
    const live=snapshot?.sections.traffic?.rows||[],connections=snapshot?.sections.connections?.rows||[],queues=snapshot?.sections.queues?.rows||[];
    const clients={};
    for(const row of connections){const ip=clientIp(row['src-address']);if(ip&&privateIp(ip))clients[ip]=(clients[ip]||0)+number(row['orig-bytes'])+number(row['repl-bytes']);}
    const topClients=Object.entries(clients).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const protocols={};for(const row of connections){const key=(row.protocol||'غير معروف').toUpperCase();protocols[key]=(protocols[key]||0)+1;}
    $('dr-traffic').innerHTML=`<div class="dr-traffic-grid"><section><h3>السرعة اللحظية على الواجهات</h3><div class="dr-scroll">${table(['الواجهة','تنزيل RX','رفع TX','Packets RX / TX'],live.sort((a,b)=>number(b['rx-bits-per-second'])+number(b['tx-bits-per-second'])-number(a['rx-bits-per-second'])-number(a['tx-bits-per-second'])).map(row=>[row.name,humanRate(row['rx-bits-per-second']),humanRate(row['tx-bits-per-second']),(row['rx-packets-per-second']||'0')+' / '+(row['tx-packets-per-second']||'0')]))}</div></section><section><h3>أكثر العملاء نقلًا للبيانات</h3><p class="dr-subtle">الإجمالي داخل الاتصالات النشطة وقت الفحص، وليس استهلاك الباقة التاريخي.</p><div class="dr-scroll">${table(['عنوان العميل','حجم البيانات'],topClients.map(([ip,bytes])=>[ip,humanBytes(bytes)]))}</div></section><section><h3>توزيع الاتصالات</h3>${table(['البروتوكول','عدد الاتصالات'],Object.entries(protocols).sort((a,b)=>b[1]-a[1]).map(item=>item))}</section><section><h3>استهلاك Simple Queues</h3><div class="dr-scroll">${table(['الاسم','الهدف','المعدل TX / RX','إجمالي Bytes'],queues.filter(row=>!D.yes(row.disabled)).map(row=>[row.name,row.target||'—',(row.rate||'0/0').split('/').map(humanRate).join(' / '),(row.bytes||'0/0').split('/').map(humanBytes).join(' / ')]))}</div></section></div>`;
  }
  function render() {
    const report=D.diagnose(snapshot); metrics(report); $('dr-demo-banner').hidden=!snapshot.demo;
    $('dr-title').textContent=snapshot.sections.identity?.rows[0]?.name||'نتائج فحص الراوتر';
    $('dr-time').textContent=`${snapshot.host} · ${new Date(snapshot.capturedAt*1000).toLocaleString('ar-EG')} · ${snapshot.sections.resource?.rows[0]?.version||'الإصدار غير متاح'}`;
    $('dr-findings').innerHTML=`<p class="dr-note">${report.findings.length?'تم رصد '+report.findings.length+' ملاحظة تحتاج تقييمًا.':'لم ترصد القواعد الحالية تنبيهات في البيانات المتاحة؛ هذا لا يثبت سلامة الشبكة بالكامل.'}</p>`+report.findings.map(finding=>`<details class="dr-finding" data-level="${finding.severity}"><summary><span class="dr-tag">${{critical:'أولوية عالية',warning:'يحتاج مراجعة',info:'معلومة'}[finding.severity]}</span><strong>${esc(finding.title)}</strong><p class="dr-subtle">${esc(finding.confidence)}</p></summary><p><b>الدليل:</b> ${esc(finding.evidence)}</p><b>خطوات التحقق والحل</b><ol>${finding.solution.map(value=>'<li>'+esc(value)+'</li>').join('')}</ol><span class="dr-subtle">أمر للفحص اليدوي — لا يتم تنفيذه تلقائيًا</span><pre>${esc(finding.command)}</pre></details>`).join('');
    $('dr-coverage').innerHTML=report.coverage.map(item=>`<div data-state="${item.status}">${item.name}<small>${item.status==='ok'?'تمت القراءة · '+item.count:item.status==='partial'?'جزئي · حد ٢٠٠٠ سجل':'غير متاح'}</small>${item.reason?'<span>'+esc(item.reason)+'</span>':''}</div>`).join('');
    $('dr-interfaces').innerHTML=table(['الواجهة','النوع','الحالة','أخطاء RX / TX'],(snapshot.sections.interfaces?.rows||[]).map(item=>[item.name,item.type,D.yes(item.disabled)?'معطلة':item.running===undefined?'غير معلوم':D.yes(item.running)?'متصلة':'غير متصلة',(item['rx-error']??'—')+' / '+(item['tx-error']??'—')]));
    traffic(); logs(); $('dr-details').hidden=false; $('dr-export').disabled=false;
  }

  $('dr-demo').onclick=()=>{ if(busy)return; snapshot=D.demo(); render(); status('تم عرض بيانات توضيحية.'); };
  $('dr-search').oninput=logs;
  for(const tab of ['traffic','interfaces','logs']) $('dr-tab-'+tab).onclick=()=>{ for(const name of ['traffic','interfaces','logs']) { $('dr-'+name).hidden=name!==tab; $('dr-tab-'+name).setAttribute('aria-selected',String(name===tab)); } };
  $('dr-export').onclick=()=>{ if(!snapshot)return; const report={product:'MikroTools Network Doctor',...snapshot,diagnosis:D.diagnose(snapshot)}; const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})); const link=document.createElement('a'); link.href=url; link.download='network-doctor-'+(snapshot.demo?'DEMO-':'')+new Date().toISOString().slice(0,10)+'.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); };

  const form=$('dr-connect');
  async function runScan(){
    if(busy)return; busy=true; $('dr-scan').disabled=true; $('dr-demo').disabled=true; $('dr-scan').classList.add('dr-loading'); status('جارٍ اتصال سيرفر الموقع بالراوتر وتحليل البيانات…');
    const body={host:form.elements.host.value.trim(),username:form.elements.username.value.trim(),password:form.elements.password.value};
    try { const response=await fetch('/api/doctor/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)}); const result=await response.json(); if(!response.ok)throw Error(result.error||'تعذر الفحص.'); snapshot=result; render(); status('تم الاتصال بالميكروتك واكتمل الفحص.'); }
    catch(error) { status(error.name==='TypeError'?'تعذر الوصول إلى خدمة التحليل على سيرفر الموقع.':(error.message||'تعذر الاتصال.'),true); }
    finally { form.elements.password.value=''; body.password=''; busy=false; $('dr-scan').disabled=false; $('dr-demo').disabled=false; $('dr-scan').classList.remove('dr-loading'); }
  }
  form.onsubmit=event=>{
    event.preventDefault();
    if(busy)return;
    if(window.MikroAccess) window.MikroAccess.require(runScan);
    else status('جاري تحميل نظام الاشتراك، حاول مرة أخرى بعد لحظة.',true);
  };
  metrics(); $('dr-coverage').innerHTML=Object.values(D.names).map(name=>`<div data-state="unavailable">${name}<small>بانتظار الفحص</small></div>`).join('');
})();
