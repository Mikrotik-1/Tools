(function(root){'use strict';
const names={identity:'هوية الراوتر',resource:'موارد الجهاز',interfaces:'واجهات الشبكة',traffic:'الترافيك اللحظي',connections:'اتصالات الشبكة',queues:'استهلاك Queues',routes:'التوجيه',dns:'DNS',dhcp:'خوادم DHCP',leases:'عناوين العملاء',hotspot:'Hotspot',ppp:'جلسات PPP',services:'خدمات الإدارة',firewall:'قواعد الحماية',logs:'السجلات'};
const yes=v=>v===true||v==='true'||v==='yes';
const num=v=>v===undefined||v===''?NaN:Number(v);
function diagnose(snapshot){
 const sections=snapshot.sections||{},rows=k=>sections[k]?.rows||[],complete=k=>sections[k]?.status==='ok', findings=[];
 const add=(id,severity,title,evidence,solution,command,confidence='مؤكد في اللقطة')=>findings.push({id,severity,title,evidence,solution,command,confidence});
 const resource=rows('resource')[0]||{},cpu=num(resource['cpu-load']),total=num(resource['total-memory']),free=num(resource['free-memory']);
 if(cpu>=85)add('cpu','warning','ضغط مرتفع على المعالج',`استهلاك المعالج ${cpu}% وقت الفحص.`,['أعد الفحص وقت البطء لتتأكد إن الارتفاع مستمر.','افتح Profile وحدد الخدمة الأعلى استهلاكًا قبل تغيير الإعدادات.'],'/tool profile');
 if(total>0&&free/total<.1)add('memory','critical','الذاكرة المتاحة منخفضة',`المتاح ${Math.round(free/total*100)}% من الذاكرة.`,['راجع عدد الاتصالات والخدمات النشطة.','قارن الاستهلاك عبر عدة فحوص قبل اتخاذ إجراء.'],'/system resource print');
 for(const item of rows('interfaces')){
  if(!yes(item.disabled)&&item.running!==undefined&&!yes(item.running))add('link-'+item.name,'info','واجهة غير متصلة: '+item.name,'الواجهة مفعلة لكن running=false.',['لو المنفذ مستخدم، راجع الكابل والطرف المقابل.','لو المنفذ غير مستخدم فالحالة طبيعية.'],'/interface print detail','يحتاج معرفة استخدام المنفذ');
  const errors=num(item['rx-error'])+num(item['tx-error']);
  if(errors>0)add('errors-'+item.name,'warning','أخطاء مسجلة على '+item.name,`${errors} خطأ في العدادات التراكمية؛ ليست معدلًا لحظيًا.`,['أعد الفحص وقارن العدادات لمعرفة هل الأخطاء تزيد.','افحص الكابل والتفاوض على السرعة في الطرفين.'],'/interface ethernet print stats','مؤكد تاريخيًا؛ الاستمرار غير معلوم');
 }
 const traffic=rows('traffic'),connections=rows('connections');
 const peak=traffic.reduce((best,item)=>Math.max(best,num(item['rx-bits-per-second'])||0,num(item['tx-bits-per-second'])||0),0);
 const liveErrors=traffic.reduce((sum,item)=>sum+(num(item['rx-errors-per-second'])||0)+(num(item['tx-errors-per-second'])||0)+(num(item['rx-drops-per-second'])||0)+(num(item['tx-drops-per-second'])||0),0);
 if(liveErrors>0)add('live-traffic-errors','warning','فقد أو أخطاء أثناء مرور الترافيك',`تم رصد ${liveErrors} حزمة/ثانية أخطاء أو Drops وقت الفحص.`,['افتح تبويب الترافيك وحدد الواجهة المتأثرة.','راجع الكابل وسرعة المنفذ والـQueue على الواجهة.'],'/interface monitor-traffic [find] once');
 if(sections.connections?.status==='partial')add('connection-load','warning','عدد الاتصالات كبير',`تجاوزت قائمة Connection Tracking حد عرض 2000 اتصال.`,['راجع أكثر عناوين العملاء ظهورًا واستهلاكًا.','افحص إعدادات connection tracking وحدود الأجهزة كثيرة الاتصالات.'],'/ip firewall connection print count-only','مؤكد وقت اللقطة');
 if(complete('routes')&&!rows('routes').some(r=>r['dst-address']==='0.0.0.0/0'&&yes(r.active)&&!yes(r.disabled)))add('route','warning','لم يظهر مسار IPv4 افتراضي نشط','لا يوجد 0.0.0.0/0 نشط في البيانات المقروءة.',['راجع اتصال مزود الإنترنت والـGateway.','قد يكون الجهاز يعمل كسويتش أو يعتمد على IPv6؛ تحقق من دوره أولًا.'],'/ip route print detail','اشتباه بحسب دور الجهاز');
 const dns=rows('dns')[0];
 if(dns&&!dns.servers&&!dns['dynamic-servers'])add('dns','warning','لا تظهر خوادم DNS للراوتر','حقلا servers وdynamic-servers فارغان.',['راجع DNS القادم من مزود الخدمة.','تأكد هل العملاء يستخدمون DNS مستقلًا قبل تعديل الراوتر.'],'/ip dns print','مشكلة محتملة إذا كان الراوتر محلل DNS');
 const invalid=rows('dhcp').filter(r=>yes(r.invalid)&&!yes(r.disabled));
 if(invalid.length)add('dhcp','critical','خادم DHCP بإعداد غير صالح',invalid.map(r=>r.name).join('، '),['راجع واجهة الخادم وعنوان الشبكة والـPool.','تأكد من توافق نطاق التوزيع مع عنوان الواجهة.'],'/ip dhcp-server print detail');
 const conflicts=rows('leases').filter(r=>r.status==='conflict');
 if(conflicts.length)add('conflicts','warning','تعارضات في عناوين DHCP',`${conflicts.length} عنوان بحالة conflict.`,['راجع الأجهزة ذات العناوين الثابتة داخل نطاق التوزيع.','تحقق من الجهاز المالك للعنوان قبل حذفه أو تغييره.'],'/ip dhcp-server lease print detail');
 const open=rows('services').filter(r=>!yes(r.disabled)&&(!r.address||r.address==='0.0.0.0/0'||r.address==='::/0'));
 if(open.length)add('services','warning','خدمات إدارة بلا تقييد مصدر داخل الخدمة',open.map(r=>r.name+':'+r.port).join('، '),['راجع السماح من شبكة الإدارة فقط.','راجع قواعد input قبل أي تغيير؛ هذا لا يثبت أن الخدمة مكشوفة للإنترنت.'],'/ip service print','يحتاج مراجعة الجدار الناري');
 const failed=rows('logs').filter(r=>/login failure|authentication failed|فشل.*(?:دخول|مصادقة)/i.test(r.message||''));
 if(failed.length)add('auth','warning','محاولات مصادقة فاشلة',`${failed.length} حدث في السجلات المتاحة.`,['راجع المصدر والتوقيت وهل المحاولات تخص مستخدمًا معروفًا.','راجع تقييد الوصول وكلمات المرور إذا كان المصدر غير معروف.'],'/log print where topics~"account"','أحداث مؤكدة؛ ليست دليل اختراق');
 const bad=rows('logs').filter(r=>/(^|,)(critical|error)(,|$)/.test(r.topics||''));
 if(bad.length)add('logs','warning','أحداث تحتاج مراجعة',`${bad.length} سجل بمستوى error أو critical.`,['افتح السجلات وحدد الحدث المتكرر وتوقيته.','اربط الحدث بتأثر الخدمة قبل تطبيق إصلاح.'],'/log print');
 const coverage=Object.keys(names).map(key=>({key,name:names[key],status:sections[key]?.status||'unavailable',count:rows(key).length,reason:sections[key]?.reason||''}));
 findings.sort((a,b)=>['critical','warning','info'].indexOf(a.severity)-['critical','warning','info'].indexOf(b.severity));
 return {findings,coverage,resource,cpu,memory:total>0?Math.round((1-free/total)*100):null,complete:coverage.filter(c=>c.status==='ok').length,peakTraffic:peak,connections:connections.length};
}
function demo(){const sections={};Object.keys(names).forEach(k=>sections[k]={status:'ok',rows:[]});
 sections.identity.rows=[{name:'MikroTools · Demo Router'}];sections.resource.rows=[{version:'7.x · DEMO','board-name':'RouterBOARD','uptime':'12d 04:32:18','cpu-load':'89','total-memory':'268435456','free-memory':'94371840'}];
 sections.interfaces.rows=[{name:'ether1-WAN',type:'ether',running:'true',disabled:'false','rx-error':'14','tx-error':'0'},{name:'bridge-LAN',type:'bridge',running:'true',disabled:'false'},{name:'ether5',type:'ether',running:'false',disabled:'false'}];
 sections.traffic.rows=[{name:'ether1-WAN','rx-bits-per-second':'48500000','tx-bits-per-second':'8200000','rx-packets-per-second':'5120','tx-packets-per-second':'1380'},{name:'bridge-LAN','rx-bits-per-second':'8700000','tx-bits-per-second':'49200000','rx-packets-per-second':'1440','tx-packets-per-second':'5260'},{name:'ether5','rx-bits-per-second':'0','tx-bits-per-second':'0'}];
 sections.connections.rows=[{'src-address':'192.168.88.25:53120','dst-address':'142.250.200.78:443',protocol:'tcp','orig-bytes':'184000000','repl-bytes':'820000000','connection-state':'established'},{'src-address':'192.168.88.41:49822','dst-address':'157.240.241.17:443',protocol:'tcp','orig-bytes':'52000000','repl-bytes':'460000000','connection-state':'established'},{'src-address':'192.168.88.12:62410','dst-address':'1.1.1.1:53',protocol:'udp','orig-bytes':'4200','repl-bytes':'9800'}];
 sections.queues.rows=[{name:'office','target':'192.168.88.0/24','rate':'7200000/41200000','bytes':'980000000/5240000000','disabled':'false'}];
 sections.routes.rows=[{'dst-address':'0.0.0.0/0',gateway:'192.0.2.1',active:'true'}];sections.dns.rows=[{servers:'1.1.1.1,8.8.8.8'}];sections.dhcp.rows=[{name:'LAN-DHCP',interface:'bridge-LAN',invalid:'false'}];sections.leases.rows=Array.from({length:24},(_,i)=>({address:'192.168.88.'+(i+10),status:'bound'}));sections.hotspot.rows=Array.from({length:12},()=>({uptime:'1h'}));sections.ppp.rows=Array.from({length:8},()=>({service:'pppoe'}));sections.services.rows=[{name:'winbox',port:'8291',address:'192.168.88.0/24',disabled:'false'}];sections.logs.rows=[{time:'10:32:12',topics:'system,error,critical',message:'login failure for user admin from 192.0.2.20 via winbox'},{time:'10:31:02',topics:'interface,info',message:'ether1-WAN link up (speed 1G, full duplex)'},{time:'10:30:45',topics:'dhcp,info',message:'LAN-DHCP assigned 192.168.88.12'}];return {demo:true,host:'192.168.88.1',capturedAt:Date.now()/1000,sections};}
root.NetworkDoctor={diagnose,demo,names,yes};if(typeof module!=='undefined')module.exports=root.NetworkDoctor;
})(typeof window==='undefined'?globalThis:window);
