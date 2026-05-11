(function () {
  if (window.MikroChat) return;

  const isArabic = () => (document.documentElement.lang || "ar").toLowerCase().startsWith("ar") || document.documentElement.dir === "rtl";
  const whatsapp = "https://wa.me/201092503391";

  const pages = [
    { title: "إعدادات الهوت سبوت", url: "hotspot.html", words: ["hotspot", "هوت", "سبوت", "ppp", "pppoe", "dhcp", "nat", "سكربت"] },
    { title: "دمج خطوط v6", url: "merge-v6.html", words: ["v6", "دمج", "خطوط", "load", "balance", "balancing", "pcc"] },
    { title: "دمج خطوط v7", url: "merge-v7.html", words: ["v7", "دمج", "خطوط", "load", "balance", "balancing", "pcc"] },
    { title: "حجب المواقع", url: "block-sites.html", words: ["حجب", "موقع", "مواقع", "يوتيوب", "تيك", "فيس", "facebook", "youtube", "layer7", "tls"] },
    { title: "بروفايلات السرعة", url: "speed-profiles.html", words: ["سرعة", "سرعات", "بروفايل", "queue", "profile", "limit", "upload", "download"] },
    { title: "تصميم هوت سبوت", url: "Hotspot%20Editor.html", words: ["تصميم", "صفحة", "لوجن", "login", "template", "html"] },
    { title: "مصمم الكروت", url: "CardEditor.html", words: ["كارت", "كروت", "card", "voucher", "طباعة"] },
    { title: "محلل السجلات", url: "log.html", words: ["لوج", "سجل", "سجلات", "log", "logs", "error", "خطأ"] },
    { title: "المشكلات الشائعة", url: "troubleshooting.html", words: ["مشكلة", "مشاكل", "حل", "trouble", "internet", "نت", "dns", "ping"] },
  ];

  const quickReplies = [
    "عايز أدمج خطوط",
    "الهوت سبوت مش شغال",
    "أحجب موقع",
    "أعمل سرعات",
    "أحل مشكلة النت",
  ];

  const styles = `
    .mikro-chat-panel{position:fixed;left:112px;bottom:22px;width:min(380px,calc(100vw - 28px));height:min(560px,calc(100vh - 110px));background:#0f172a;color:#e5e7eb;border:1px solid rgba(148,163,184,.22);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.45);z-index:999999;display:none;flex-direction:column;overflow:hidden;font-family:'Tajawal','Inter',system-ui,sans-serif}
    .mikro-chat-panel.open{display:flex}
    .mikro-chat-head{background:linear-gradient(135deg,#6366f1,#a855f7);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .mikro-chat-title{display:flex;align-items:center;gap:10px;font-weight:800}
    .mikro-chat-title i{width:34px;height:34px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}
    .mikro-chat-sub{font-size:12px;color:rgba(255,255,255,.78);margin-top:2px;font-weight:500}
    .mikro-chat-close{width:34px;height:34px;border:0;border-radius:10px;background:rgba(15,23,42,.22);color:#fff;cursor:pointer;font-size:17px}
    .mikro-chat-body{flex:1;overflow:auto;padding:14px;background:linear-gradient(180deg,#111827,#0f172a)}
    .mikro-msg{max-width:88%;padding:10px 12px;border-radius:14px;margin:0 0 10px;line-height:1.65;font-size:14px;white-space:pre-wrap}
    .mikro-msg.bot{background:rgba(255,255,255,.08);border:1px solid rgba(148,163,184,.16);margin-left:auto}
    .mikro-msg.user{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;margin-right:auto}
    .mikro-chat-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .mikro-chat-links a,.mikro-chip{border:1px solid rgba(129,140,248,.35);background:rgba(99,102,241,.14);color:#c7d2fe;text-decoration:none;border-radius:999px;padding:7px 10px;font-size:12px;cursor:pointer}
    .mikro-quick{display:flex;gap:8px;overflow:auto;padding:10px 12px;background:#111827;border-top:1px solid rgba(148,163,184,.16)}
    .mikro-chat-form{display:flex;gap:8px;padding:12px;background:#0b1120;border-top:1px solid rgba(148,163,184,.16)}
    .mikro-chat-input{flex:1;min-width:0;border:1px solid rgba(148,163,184,.24);background:#111827;color:#fff;border-radius:12px;padding:11px 12px;font-family:inherit;outline:none}
    .mikro-chat-send{width:44px;border:0;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;cursor:pointer;font-size:16px}
    @media(max-width:640px){.mikro-chat-panel{left:14px;right:14px;bottom:16px;width:auto;height:min(540px,calc(100vh - 90px))}}
  `;

  function ensureStyles() {
    if (document.getElementById("mikro-chat-style")) return;
    const style = document.createElement("style");
    style.id = "mikro-chat-style";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function createChat() {
    ensureStyles();
    let chat = document.getElementById("mikroChatPanel");
    if (chat) return chat;

    chat = document.createElement("div");
    chat.id = "mikroChatPanel";
    chat.className = "mikro-chat-panel";
    chat.dir = "rtl";
    chat.innerHTML = `
      <div class="mikro-chat-head">
        <div class="mikro-chat-title">
          <i class="fas fa-robot"></i>
          <div>
            <div>مساعد MikroTools</div>
            <div class="mikro-chat-sub">اسألني عن الهوت سبوت، الدمج، الحجب، السرعات، واللوجات</div>
          </div>
        </div>
        <button class="mikro-chat-close" type="button" aria-label="إغلاق"><i class="fas fa-times"></i></button>
      </div>
      <div class="mikro-chat-body" id="mikroChatBody"></div>
      <div class="mikro-quick">${quickReplies.map((text) => `<button class="mikro-chip" type="button">${text}</button>`).join("")}</div>
      <form class="mikro-chat-form" id="mikroChatForm">
        <input class="mikro-chat-input" id="mikroChatInput" autocomplete="off" placeholder="اكتب سؤالك هنا...">
        <button class="mikro-chat-send" type="submit" aria-label="إرسال"><i class="fas fa-paper-plane"></i></button>
      </form>
    `;
    document.body.appendChild(chat);

    chat.querySelector(".mikro-chat-close").addEventListener("click", () => chat.classList.remove("open"));
    chat.querySelectorAll(".mikro-chip").forEach((chip) => chip.addEventListener("click", () => ask(chip.textContent)));
    chat.querySelector("#mikroChatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = chat.querySelector("#mikroChatInput");
      ask(input.value);
      input.value = "";
    });

    addBot("أهلًا بيك. أنا مساعد MikroTools. قولّي المشكلة أو الأداة اللي محتاجها، وأنا أوصلك للخطوة الصح.");
    return chat;
  }

  function normalize(text) {
    return (text || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/[ة]/g, "ه").replace(/[ى]/g, "ي");
  }

  function matchedPages(text) {
    const clean = normalize(text);
    return pages.filter((page) => page.words.some((word) => clean.includes(normalize(word))));
  }

  function answer(text) {
    const clean = normalize(text);
    const links = matchedPages(text).slice(0, 3);

    if (!clean) return { text: "اكتب سؤالك أو اختار من الاقتراحات السريعة.", links: [] };
    if (/(شكرا|تسلم|thanks|thank)/.test(clean)) return { text: "تحت أمرك في أي وقت. ابعتلي المشكلة أو اسم الأداة ونكمل.", links: [] };
    if (/(نسيت|باسورد|كلمه المرور|password|login|دخول)/.test(clean)) return { text: "لو المشكلة في تسجيل الدخول، جرّب زر نسيت كلمة المرور من نافذة الدخول. لو الأداة مقفولة، سجّل دخول الأول وبعدها افتح الأداة تاني.", links: [{ title: "تسجيل الدخول", url: "login.html" }] };
    if (/(كود تفعيل|تفعيل|مدفوع|اشتراك|سعر|اسعار|pricing)/.test(clean)) return { text: "الأدوات المدفوعة تحتاج تفعيل. أسرع حل إنك تتواصل على واتساب وتذكر اسم الأداة المطلوبة.", links: [{ title: "الأسعار", url: "pricing.html" }, { title: "واتساب الدعم", url: whatsapp }] };
    if (/(نت|انترنت|dns|ping|gateway|بوابه)/.test(clean)) return { text: "ابدأ بفحص سريع: جرّب ping للراوتر، ثم ping 8.8.8.8، وبعدها DNS. لو ping للراوتر شغال و8.8.8.8 لا، راجع الـ gateway والـ NAT. لو 8.8.8.8 شغال والمواقع لا، المشكلة غالبًا DNS.", links: [{ title: "المشكلات الشائعة", url: "troubleshooting.html" }] };
    if (/(سرعه|بطئ|بطيء|queue|limit)/.test(clean)) return { text: "للتحكم في السرعات استخدم بروفايلات السرعة. حدد download و upload لكل باقة، وخلي أسماء البروفايلات واضحة عشان تربطها بالمستخدمين بسهولة.", links };
    if (/(حجب|block|layer7|tls|يوتيوب|فيس|تيك)/.test(clean)) return { text: "للحجب الأفضل تبدأ بأداة حجب المواقع. بعض المواقع تحتاج TLS Host بدل Layer7، خصوصًا المواقع الحديثة وHTTPS.", links };
    if (/(دمج|خطوط|load|balance|pcc|v6|v7)/.test(clean)) return { text: "للدمج اختار إصدار الراوتر الأول: RouterOS v6 افتح دمج v6، وRouterOS v7 افتح دمج v7. اكتب عدد الخطوط واسم كارت LAN بدقة قبل توليد السكربت.", links };
    if (/(هوت|سبوت|hotspot|ppp|pppoe|dhcp|nat)/.test(clean)) return { text: "للهوت سبوت راجع اسم كارت LAN ورينج المشتركين. لو المستخدم بيفتح صفحة الدخول ومفيش نت، غالبًا NAT أو DNS. لو الصفحة مش بتظهر، راجع hotspot profile و DNS name.", links };
    if (/(لوج|log|error|سجل)/.test(clean)) return { text: "انسخ رسائل اللوج في محلل السجلات. لو ظهر DHCP أو radius أو hotspot error ابعتهولي هنا وأنا أقولك اتجاه الحل.", links };

    return {
      text: "فهمت إنك محتاج مساعدة. اكتبلي تفاصيل أكتر: نوع الراوتر، إصدار RouterOS، واسم الأداة أو نص رسالة الخطأ. ممكن كمان تختار صفحة من الاقتراحات دي.",
      links: links.length ? links : [{ title: "المشكلات الشائعة", url: "troubleshooting.html" }, { title: "واتساب الدعم", url: whatsapp }],
    };
  }

  function addMessage(text, type, links) {
    const body = document.getElementById("mikroChatBody");
    const msg = document.createElement("div");
    msg.className = `mikro-msg ${type}`;
    msg.textContent = text;
    if (links && links.length) {
      const linkWrap = document.createElement("div");
      linkWrap.className = "mikro-chat-links";
      links.forEach((link) => {
        const a = document.createElement("a");
        a.href = link.url;
        a.textContent = link.title;
        if (link.url.startsWith("http")) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        linkWrap.appendChild(a);
      });
      msg.appendChild(linkWrap);
    }
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function addBot(text, links) {
    addMessage(text, "bot", links);
  }

  function ask(rawText) {
    const text = (rawText || "").trim();
    if (!text) return;
    createChat();
    addMessage(text, "user");
    setTimeout(() => {
      const reply = answer(text);
      addBot(reply.text, reply.links);
    }, 220);
  }

  window.MikroChat = {
    open() {
      const chat = createChat();
      chat.classList.add("open");
      setTimeout(() => {
        const input = document.getElementById("mikroChatInput");
        if (input) input.focus();
      }, 80);
    },
    close() {
      const chat = document.getElementById("mikroChatPanel");
      if (chat) chat.classList.remove("open");
    },
    ask,
  };

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "mikro-open-chat") {
      window.MikroChat.open();
    }
  });
})();
