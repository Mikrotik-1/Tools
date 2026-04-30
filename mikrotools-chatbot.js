/*
  MikroTools Network Assistant Chatbot
  ضع الملف باسم: chatbot.js
  ثم أضف قبل </body> في الصفحة الرئيسية:
  <script src="chatbot.js"></script>
*/

(function () {
  const BOT_NAME = 'مساعد MikroTools';
  const WHATSAPP_NUMBER = '201092503391';

  const quickQuestions = [
    'النت قاطع عند العملاء',
    'الهوت سبوت مش بيفتح',
    'DHCP مش بيوزع IP',
    'السرعة بطيئة',
    'DNS لا يعمل',
    'مشكلة دمج خطوط',
    'PPPoE لا يتصل',
    'الواي فاي بيقطع'
  ];

  const knowledgeBase = [
    {
      keys: ['نت', 'انترنت', 'internet', 'قاطع', 'مش شغال', 'no internet', 'كل العملاء'],
      title: 'تشخيص انقطاع الإنترنت',
      answer: `ابدأ بالترتيب ده:\n\n1) من الراوتر جرّب:\n/ping 8.8.8.8\n\n2) لو فشل، راجع الـ Gateway والـ Routes:\n/ip route print\n\n3) لو Ping بالأرقام شغال والمواقع لا تفتح، المشكلة غالبًا DNS:\n/ip dns print\n/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes\n\n4) راجع NAT:\n/ip firewall nat print\n\n5) اتأكد العميل واخد IP و Gateway و DNS صح.\n\nلو المشكلة لكل العملاء: Route / DNS / NAT.\nلو لعميل واحد: IP / Signal / Queue / جهاز العميل.`
    },
    {
      keys: ['هوت سبوت', 'hotspot', 'login', 'تسجيل', 'صفحة', 'مش بيفتح', 'walled'],
      title: 'مشكلة صفحة الهوت سبوت',
      answer: `لو صفحة الهوت سبوت مش بتفتح:\n\n1) جرّب من العميل فتح:\nhttp://neverssl.com\n\n2) راجع DNS:\n/ip dns print\n\n3) اتأكد Hotspot مربوط على الإنترفيس الصحيح:\n/ip hotspot print\n\n4) راجع Profile والـ DNS Name:\n/ip hotspot profile print\n\n5) راجع Walled Garden:\n/ip hotspot walled-garden print\n\n6) جرّب متصفح أو جهاز تاني.`
    },
    {
      keys: ['بطء', 'بطيء', 'slow', 'سرعة', 'تهنيج', 'تقطيع', 'ضعف'],
      title: 'تشخيص بطء السرعة',
      answer: `أسباب البطء الأكثر شيوعًا:\n\n1) عميل ساحِب السرعة:\n/interface monitor-traffic [find]\n\n2) Queue غلط أو متعارضة:\n/queue simple print\n\n3) CPU عالي:\n/tool profile\n/system resource print\n\n4) DNS بطيء. جرّب 1.1.1.1 و 8.8.8.8.\n\n5) واي فاي ضعيف أو Channel مزدحم.\n\nابدأ بفحص CPU + استهلاك الخط + عدد العملاء.`
    },
    {
      keys: ['dhcp', 'ip', 'مش بياخد', 'لا يوزع', 'lease', 'pool', 'اي بي'],
      title: 'DHCP لا يوزع IP',
      answer: `لو DHCP مش بيوزع IP:\n\n1) اتأكد DHCP Server شغال:\n/ip dhcp-server print\n\n2) اتأكد مربوط على Interface الصحيح.\n\n3) راجع الـ Pool هل خلصان؟\n/ip pool print\n\n4) راجع إن الإنترفيس عليه IP:\n/ip address print\n\n5) راجع Leases:\n/ip dhcp-server lease print\n\n6) اتأكد مفيش DHCP تاني في الشبكة عامل Conflict.`
    },
    {
      keys: ['pppoe', 'يوزر', 'باسورد', 'secret', 'profile', 'لا يتصل', 'active'],
      title: 'تشخيص PPPoE',
      answer: `لو PPPoE لا يعمل:\n\n1) راجع PPPoE Server:\n/interface pppoe-server server print\n\n2) راجع المستخدمين:\n/ppp secret print\n\n3) شوف المتصلين حاليًا:\n/ppp active print\n\n4) راجع Profile والـ Local/Remote Address:\n/ppp profile print\n\n5) راجع اللوج:\n/log print where topics~"ppp"\n\nلو في مواقع لا تفتح فقط، راجع MTU/MRU.`
    },
    {
      keys: ['dns', 'مواقع', 'اسماء', 'domain', 'دومين', 'لا تفتح'],
      title: 'تشخيص DNS',
      answer: `لو Ping على 8.8.8.8 شغال لكن المواقع لا تفتح:\n\n1) فعل Allow Remote Requests:\n/ip dns set allow-remote-requests=yes\n\n2) حدد DNS سريع:\n/ip dns set servers=1.1.1.1,8.8.8.8\n\n3) امسح الكاش:\n/ip dns cache flush\n\n4) راجع Firewall لو مانع Port 53.\n\n5) جرّب من جهاز العميل:\nping google.com\nping 8.8.8.8`
    },
    {
      keys: ['دمج', 'load', 'balancing', 'pcc', 'mangle', 'خطين', 'wan', 'routing table'],
      title: 'تشخيص دمج الخطوط Load Balancing',
      answer: `في مشاكل الدمج راجع الآتي:\n\n1) كل WAN له Gateway صحيح:\n/ip route print\n\n2) NAT موجود لكل خط:\n/ip firewall nat print\n\n3) ترتيب Mangle صحيح:\n/ip firewall mangle print\n\n4) في RouterOS v7 راجع Routing Tables:\n/routing table print\n\n5) استثني شبكات الراوترات والـ LAN من Mangle.\n\n6) لو مواقع معينة بتفصل، اعمل استثناء أو Sticky/PCC مضبوط.`
    },
    {
      keys: ['واي فاي', 'wifi', 'wireless', 'اشارة', 'signal', 'تردد', 'قناة', 'channel'],
      title: 'تشخيص Wi‑Fi',
      answer: `لو الواي فاي ضعيف أو بيقطع:\n\n1) راجع Signal Strength. الأفضل غالبًا من -35 إلى -65 dBm.\n\n2) في 2.4GHz استخدم Channel 1 أو 6 أو 11.\n\n3) قلل Channel Width في الأماكن المزدحمة.\n\n4) ابعد عن مصادر التشويش.\n\n5) لو العملاء كتير، وزعهم على أكثر من Access Point.\n\n6) 5GHz أسرع، 2.4GHz مداه أكبر.`
    },
    {
      keys: ['nat', 'masquerade', 'خروج', 'wan'],
      title: 'فحص NAT',
      answer: `لو العملاء واخدين IP لكن مفيش إنترنت، راجع NAT:\n\n/ip firewall nat print\n\nلازم يكون عندك قاعدة مثل:\n/ip firewall nat add chain=srcnat out-interface=WAN action=masquerade\n\nغير WAN باسم إنترفيس الخروج الحقيقي.`
    },
    {
      keys: ['backup', 'نسخة', 'باك اب', 'حفظ', 'export'],
      title: 'Backup قبل التعديل',
      answer: `قبل أي تعديل مهم خد نسختين:\n\n/system backup save name=before-change\n/export file=before-change-export\n\nBackup للاسترجاع السريع.\nExport للقراءة والنقل بين الأجهزة.`
    },
    {
      keys: ['لوج', 'log', 'error', 'warning', 'اخطاء'],
      title: 'فحص اللوج',
      answer: `اللوج بيكشف السبب الحقيقي غالبًا. استخدم:\n\n/log print where topics~"error|warning"\n\nلو PPPoE:\n/log print where topics~"ppp"\n\nلو DHCP:\n/log print where topics~"dhcp"\n\nابعت نص الخطأ وهيتحدد السبب بسرعة.`
    }
  ];

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();
  }

  function safeText(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function findBestAnswer(question) {
    const q = normalize(question);
    let best = null;
    let bestScore = 0;

    knowledgeBase.forEach((item) => {
      let score = 0;
      item.keys.forEach((key) => {
        if (q.includes(normalize(key))) score += 3;
      });
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    });

    return bestScore > 0 ? best : null;
  }

  function buildReply(question) {
    const item = findBestAnswer(question);
    if (item) {
      return `✅ ${item.title}\n\n${item.answer}\n\nلتحليل أدق ابعتلي:\n• نوع الراوتر\n• RouterOS v6 ولا v7\n• المشكلة لكل العملاء ولا بعضهم\n• آخر تعديل اتعمل قبل المشكلة`;
    }

    return `فهمت إن عندك مشكلة في الشبكة. عشان أحددها بدقة ابعتلي:\n\n1) نوع المشكلة: نت / هوت سبوت / DHCP / DNS / PPPoE / Wi‑Fi / دمج خطوط.\n2) بتحصل لكل العملاء ولا بعضهم؟\n3) RouterOS v6 ولا v7؟\n4) آخر تعديل اتعمل قبل المشكلة.\n\nوابدأ بالأوامر دي:\n/ping 8.8.8.8\n/ip route print\n/ip dns print\n/log print where topics~"error|warning"`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .mt-chatbot *{box-sizing:border-box}
    .mt-chatbot{position:fixed;right:22px;bottom:22px;z-index:999999;font-family:Tajawal,Arial,sans-serif;direction:rtl;color:#0f172a}
    .mt-chatbot-launch{width:62px;height:62px;border:0;border-radius:50%;background:linear-gradient(135deg,#6366f1,#10b981);color:white;display:grid;place-items:center;font-size:27px;cursor:pointer;box-shadow:0 18px 40px rgba(99,102,241,.38);transition:.25s;position:relative}
    .mt-chatbot-launch:hover{transform:translateY(-3px) scale(1.04)}
    .mt-chatbot-launch:after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(99,102,241,.28);animation:mtPulse 1.8s infinite}
    @keyframes mtPulse{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.3);opacity:0}}
    .mt-chatbot-greeting{position:absolute;right:76px;bottom:9px;width:260px;background:white;color:#1e293b;padding:12px 14px;border-radius:18px 18px 5px 18px;box-shadow:0 15px 40px rgba(0,0,0,.18);font-weight:800;font-size:14px;line-height:1.5;animation:mtPop .45s ease both}
    .mt-chatbot-greeting small{display:block;color:#64748b;font-weight:700;margin-top:2px}
    @keyframes mtPop{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
    .mt-chatbot-window{position:absolute;right:0;bottom:78px;width:365px;max-width:calc(100vw - 30px);height:560px;max-height:calc(100vh - 110px);background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.34);display:none;border:1px solid rgba(15,23,42,.08)}
    .mt-chatbot.open .mt-chatbot-window{display:flex;flex-direction:column;animation:mtUp .25s ease both}
    .mt-chatbot.open .mt-chatbot-greeting{display:none}
    @keyframes mtUp{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    .mt-chatbot-head{background:linear-gradient(135deg,#0f172a,#1e293b);color:white;padding:15px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .mt-bot-info{display:flex;align-items:center;gap:10px}
    .mt-bot-avatar{width:44px;height:44px;border-radius:15px;background:linear-gradient(135deg,#22c55e,#38bdf8);display:grid;place-items:center;font-size:20px;box-shadow:0 10px 25px rgba(34,197,94,.22)}
    .mt-bot-title{font-weight:900;font-size:16px;line-height:1.2}
    .mt-bot-status{font-size:12px;color:#cbd5e1;margin-top:2px}.mt-bot-status:before{content:'';display:inline-block;width:7px;height:7px;background:#22c55e;border-radius:50%;margin-left:6px}
    .mt-head-actions{display:flex;gap:7px}.mt-head-btn{width:35px;height:35px;border:1px solid rgba(255,255,255,.15);border-radius:12px;background:rgba(255,255,255,.08);color:white;cursor:pointer}
    .mt-chatbot-messages{flex:1;padding:14px;background:linear-gradient(180deg,#f8fafc,#eef2ff);overflow:auto;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
    .mt-msg{max-width:88%;padding:10px 12px;border-radius:16px;white-space:pre-wrap;line-height:1.65;font-size:14px;animation:mtMsg .18s ease both}
    @keyframes mtMsg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .mt-msg.bot{align-self:flex-start;background:white;border:1px solid #e2e8f0;border-bottom-right-radius:5px;color:#0f172a;box-shadow:0 6px 18px rgba(15,23,42,.05)}
    .mt-msg.user{align-self:flex-end;background:linear-gradient(135deg,#6366f1,#38bdf8);color:white;border-bottom-left-radius:5px}
    .mt-typing{display:none;align-self:flex-start;background:white;border:1px solid #e2e8f0;border-radius:15px;padding:9px 12px;color:#64748b;font-size:13px}
    .mt-chips{padding:10px 12px;background:white;border-top:1px solid #e2e8f0;display:flex;gap:7px;overflow-x:auto}
    .mt-chip{border:1px solid #dbeafe;background:#eff6ff;color:#1e40af;border-radius:999px;padding:7px 10px;font-family:inherit;font-weight:800;font-size:12px;white-space:nowrap;cursor:pointer}
    .mt-input-wrap{display:flex;gap:8px;padding:12px;background:white;border-top:1px solid #e2e8f0}
    .mt-input{flex:1;border:1px solid #cbd5e1;border-radius:15px;padding:12px;font-family:inherit;font-size:14px;outline:0}.mt-input:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.1)}
    .mt-send{width:48px;border:0;border-radius:15px;background:linear-gradient(135deg,#6366f1,#38bdf8);color:white;font-size:17px;cursor:pointer}
    .mt-footer-actions{display:flex;gap:8px;padding:0 12px 12px;background:white}.mt-wa{flex:1;text-align:center;background:#25d366;color:white;border-radius:13px;padding:9px;font-weight:900;text-decoration:none;font-size:13px}.mt-clear{border:0;border-radius:13px;padding:9px 12px;background:#f1f5f9;color:#334155;font-weight:900;font-family:inherit;cursor:pointer}
    @media(max-width:520px){.mt-chatbot{right:14px;bottom:14px}.mt-chatbot-window{width:calc(100vw - 28px);height:calc(100vh - 95px);bottom:74px}.mt-chatbot-greeting{right:0;bottom:76px;width:245px}.mt-chatbot-launch{width:58px;height:58px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'mt-chatbot';
  root.innerHTML = `
    <div class="mt-chatbot-greeting">
      👋 عندك مشكلة في الشبكة؟
      <small>اسألني وهساعدك خطوة بخطوة</small>
    </div>
    <button class="mt-chatbot-launch" type="button" aria-label="افتح مساعد الشبكات">🤖</button>
    <section class="mt-chatbot-window" aria-label="مساعد الشبكات">
      <div class="mt-chatbot-head">
        <div class="mt-bot-info">
          <div class="mt-bot-avatar">🤖</div>
          <div>
            <div class="mt-bot-title">${BOT_NAME}</div>
            <div class="mt-bot-status">جاهز للتحليل</div>
          </div>
        </div>
        <div class="mt-head-actions">
          <button class="mt-head-btn mt-copy" type="button" title="نسخ آخر رد">📋</button>
          <button class="mt-head-btn mt-close" type="button" title="إغلاق">×</button>
        </div>
      </div>
      <div class="mt-chatbot-messages"></div>
      <div class="mt-typing">المساعد يكتب...</div>
      <div class="mt-chips"></div>
      <div class="mt-input-wrap">
        <input class="mt-input" type="text" placeholder="اكتب مشكلتك هنا..." />
        <button class="mt-send" type="button">➤</button>
      </div>
      <div class="mt-footer-actions">
        <a class="mt-wa" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">تواصل واتساب</a>
        <button class="mt-clear" type="button">مسح</button>
      </div>
    </section>
  `;
  document.body.appendChild(root);

  const launchBtn = root.querySelector('.mt-chatbot-launch');
  const closeBtn = root.querySelector('.mt-close');
  const clearBtn = root.querySelector('.mt-clear');
  const copyBtn = root.querySelector('.mt-copy');
  const input = root.querySelector('.mt-input');
  const sendBtn = root.querySelector('.mt-send');
  const messages = root.querySelector('.mt-chatbot-messages');
  const typing = root.querySelector('.mt-typing');
  const chips = root.querySelector('.mt-chips');

  let lastBotAnswer = '';

  function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `mt-msg ${type}`;
    div.innerHTML = safeText(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    if (type === 'bot') lastBotAnswer = text;
  }

  function showTyping(callback) {
    typing.style.display = 'block';
    messages.scrollTop = messages.scrollHeight;
    setTimeout(() => {
      typing.style.display = 'none';
      callback();
    }, 550);
  }

  function sendMessage() {
    const question = input.value.trim();
    if (!question) return;
    addMessage(question, 'user');
    input.value = '';
    showTyping(() => addMessage(buildReply(question), 'bot'));
  }

  function initChips() {
    chips.innerHTML = '';
    quickQuestions.forEach((question) => {
      const btn = document.createElement('button');
      btn.className = 'mt-chip';
      btn.type = 'button';
      btn.textContent = question;
      btn.addEventListener('click', () => {
        input.value = question;
        sendMessage();
      });
      chips.appendChild(btn);
    });
  }

  function resetChat() {
    messages.innerHTML = '';
    addMessage('أهلاً بيك 👋 أنا مساعد MikroTools. اكتب مشكلة الشبكة اللي عندك، وأنا هديك خطوات فحص وحل مرتبة بدون ما نخاطر بإعداداتك.', 'bot');
  }

  launchBtn.addEventListener('click', () => {
    root.classList.toggle('open');
    if (root.classList.contains('open')) setTimeout(() => input.focus(), 200);
  });

  closeBtn.addEventListener('click', () => root.classList.remove('open'));
  clearBtn.addEventListener('click', resetChat);
  sendBtn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
  });

  copyBtn.addEventListener('click', async () => {
    if (!lastBotAnswer) return;
    try {
      await navigator.clipboard.writeText(lastBotAnswer);
      addMessage('تم نسخ آخر رد ✅', 'bot');
    } catch (error) {
      addMessage('المتصفح منع النسخ التلقائي. انسخ الرد يدويًا.', 'bot');
    }
  });

  initChips();
  resetChat();
})();
