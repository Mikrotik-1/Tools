(function () {
    'use strict';

    var excludedPages = ['admin.html', 'mikro-icons.html'];
    var page = (location.pathname || '').split('/').pop() || 'index.html';
    if (excludedPages.indexOf(page) !== -1) return;

    var BIN_ID = '6984fe4d43b1c97be9684aa8';
    var API_KEY = '$2a$10$sDP72/VHq2TmDVYz8R1P1uwCbqVkDiIKs9yAeh0hxrEHnKnggxa0G';
    var API_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID + '/latest';
    var FIREBASE_API_KEY = 'AIzaSyAfgN8SAIhSU3AN-Az2Kzw2EP-XpptEsN4';
    var FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/mikro-tools/databases/(default)/documents/problems/mikrotools_paywall_config?key=' + FIREBASE_API_KEY;
    var ACCESS_KEY = 'mikrotools_paid_access';
    var CONFIG_CACHE_KEY = 'mikrotools_paid_config';
    var state = { config: null, loading: false, pendingAction: null, approvedTarget: null, statusTimer: null, monitorTimer: null };

    function now() { return Date.now(); }

    function normalizePage(value) {
        return String(value || '').split('?')[0].split('#')[0].split('/').pop() || 'index.html';
    }

    function readSession() {
        try { return JSON.parse(localStorage.getItem(ACCESS_KEY) || 'null'); }
        catch (e) { return null; }
    }

    function sessionAllowsPage(session) {
        if (!session) return false;
        if (session.scope === 'all' || session.allPages === true) return true;
        var pages = Array.isArray(session.pages) ? session.pages.map(normalizePage) : [];
        return pages.indexOf(page) !== -1;
    }

    function hasValidSession() {
        var session = readSession();
        return !!(session && Number(session.expiresAt) > now() && sessionAllowsPage(session));
    }

    function formatLeft(ms) {
        var minutes = Math.max(0, Math.ceil(ms / 60000));
        if (minutes < 60) return minutes + ' دقيقة';
        var hours = Math.floor(minutes / 60);
        var remainingMinutes = minutes % 60;
        return remainingMinutes ? hours + ' ساعة و' + remainingMinutes + ' دقيقة' : hours + ' ساعة';
    }

    function formatDuration(ms) {
        var totalSeconds = Math.max(0, Math.floor(ms / 1000));
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;
        var clock = [hours, minutes, seconds].map(function (value) { return String(value).padStart(2, '0'); }).join(':');
        return days > 0 ? days + ' يوم ' + clock : clock;
    }

    function getCodeText(code) {
        return String(code || '').trim();
    }

    function codeAllowsPage(item) {
        if (!item) return false;
        if (item.scope === 'all' || item.allPages === true) return true;
        var pages = Array.isArray(item.pages) ? item.pages.map(normalizePage) : [];
        return pages.indexOf(page) !== -1;
    }

    function normalizeConfig(paywall) {
        paywall = paywall || {};
        paywall.enabled = paywall.enabled !== false;
        paywall.durationHours = Number(paywall.durationHours || 24);
        paywall.codes = Array.isArray(paywall.codes) ? paywall.codes : [];
        paywall.codes.forEach(function (item) {
            if (!item || item.expiresAt || !item.createdAt) return;
            var createdAt = Date.parse(item.createdAt);
            var durationMinutes = Math.max(1, Number(item.durationMinutes || (item.durationHours || paywall.durationHours || 24) * 60));
            if (Number.isFinite(createdAt)) {
                item.durationMinutes = durationMinutes;
                item.durationHours = durationMinutes / 60;
                item.expiresAt = new Date(createdAt + durationMinutes * 60000).toISOString();
            }
        });
        return paywall;
    }

    function cacheConfig(paywall) {
        try { localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(paywall)); } catch (e) {}
        return paywall;
    }

    function readCachedConfig() {
        try {
            var cached = JSON.parse(localStorage.getItem(CONFIG_CACHE_KEY) || 'null');
            return cached ? normalizeConfig(cached) : null;
        } catch (e) { return null; }
    }

    async function loadFirestoreConfig() {
        var response = await fetch(FIRESTORE_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Firestore HTTP ' + response.status);
        var data = await response.json();
        var raw = data && data.fields && data.fields.payload && data.fields.payload.stringValue;
        if (!raw) throw new Error('Firestore config is empty');
        return normalizeConfig(JSON.parse(raw));
    }

    async function loadLegacyConfig() {
        var response = await fetch(API_URL, { headers: { 'X-Master-Key': API_KEY }, cache: 'no-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        var adminData = (data.record && data.record.adminData) || {};
        return normalizeConfig(adminData.paywall || {});
    }

    async function loadConfig() {
        var firestoreError = null;
        for (var attempt = 0; attempt < 2; attempt++) {
            try { return cacheConfig(await loadFirestoreConfig()); }
            catch (error) {
                firestoreError = error;
                if (attempt === 0) await new Promise(function (resolve) { setTimeout(resolve, 700); });
            }
        }
        try { return cacheConfig(await loadLegacyConfig()); }
        catch (legacyError) {
            var cached = readCachedConfig();
            if (cached) return cached;
            throw firestoreError || legacyError;
        }
    }

    function ensureStyles() {
        if (document.getElementById('mikroAccessStyles')) return;
        var style = document.createElement('style');
        style.id = 'mikroAccessStyles';
        style.textContent = [
            '#mikroAccessOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.84);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Tajawal,Arial,sans-serif;direction:rtl;color:#fff;backdrop-filter:blur(8px)}',
            '#mikroAccessBox{position:relative;width:min(430px,100%);background:#172033;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:28px 24px 24px;box-shadow:0 28px 70px rgba(0,0,0,.4)}',
            '#mikroAccessClose{position:absolute;top:10px;left:10px;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:24px;line-height:1;cursor:pointer}',
            '#mikroAccessBox h2{margin:0 0 10px;font-size:24px;font-weight:800}',
            '#mikroAccessBox p{margin:0 0 18px;color:#cbd5e1;line-height:1.7;font-size:14px}',
            '#mikroAccessInput{box-sizing:border-box;width:100%;padding:15px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0f172a;color:#fff;font-size:17px;outline:none;text-align:center;letter-spacing:1px}',
            '#mikroAccessInput:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.2)}',
            '#mikroAccessBtn{width:100%;margin-top:12px;padding:14px;border:0;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:800;cursor:pointer}',
            '#mikroAccessBtn:disabled{opacity:.65;cursor:not-allowed}',
            '#mikroAccessMsg{min-height:22px;margin-top:12px;font-size:13px;text-align:center;color:#fca5a5}',
            '#mikroAccessContact{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);text-align:center}',
            '#mikroAccessContact p{margin:0 0 9px;color:#cbd5e1;font-size:13px}',
            '#mikroAccessWhatsapp{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;padding:12px;border-radius:10px;background:#25d366;color:#fff;text-decoration:none;font-size:14px;font-weight:800;transition:background .2s,transform .2s}',
            '#mikroAccessWhatsapp:hover{background:#1fb85a;transform:translateY(-1px)}',
            '#mikroAccessStatus{position:fixed;right:16px;bottom:16px;z-index:2147482000;width:min(330px,calc(100vw - 32px));box-sizing:border-box;background:#172033;color:#fff;border:1px solid rgba(139,92,246,.45);border-radius:10px;padding:12px 14px;box-shadow:0 14px 34px rgba(15,23,42,.3);font-family:Tajawal,Arial,sans-serif;direction:rtl}',
            '#mikroAccessStatusTitle{font-size:13px;font-weight:800;margin-bottom:7px;color:#c4b5fd}',
            '#mikroAccessStatusTimes{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#cbd5e1}',
            '#mikroAccessStatusTimes strong{display:block;margin-top:2px;color:#fff;font-size:15px;direction:ltr;text-align:right}',
            '#mikroAccessStatusExpiry{margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;color:#94a3b8}',
            '@media(max-width:600px){#mikroAccessStatus{right:10px;bottom:10px;width:calc(100vw - 20px);padding:10px 12px}}',
            '.mikro-access-hidden{overflow:hidden!important}'
        ].join('');
        document.head.appendChild(style);
    }

    function createOverlay() {
        var existing = document.getElementById('mikroAccessOverlay');
        if (existing) return existing;
        ensureStyles();
        var overlay = document.createElement('div');
        var whatsappMessage = 'مرحبًا، أريد الاشتراك في MikroTools والحصول على باسورد لتفعيل أداة: ' + (document.title || page);
        var whatsappUrl = 'https://wa.me/201092503391?text=' + encodeURIComponent(whatsappMessage);
        overlay.id = 'mikroAccessOverlay';
        overlay.innerHTML = '<div id="mikroAccessBox"><button id="mikroAccessClose" type="button" title="اغلاق">&times;</button><h2>الميزة دي مدفوعة</h2><p>ادخل باسورد الاشتراك لاستخدام الأداة أو الحصول على النتيجة. تقدر تكمل تصفح الموقع عادي في أي وقت.</p><input id="mikroAccessInput" type="password" autocomplete="off" placeholder="اكتب الباسورد هنا"><button id="mikroAccessBtn" type="button">فتح الميزة</button><div id="mikroAccessMsg"></div><div id="mikroAccessContact"><p>ليس لديك باسورد اشتراك؟</p><a id="mikroAccessWhatsapp" href="' + whatsappUrl + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i><span>تواصل عبر واتساب للاشتراك</span></a></div></div>';
        document.body.appendChild(overlay);
        document.documentElement.classList.add('mikro-access-hidden');

        var input = document.getElementById('mikroAccessInput');
        document.getElementById('mikroAccessBtn').addEventListener('click', validateCode);
        document.getElementById('mikroAccessClose').addEventListener('click', closeOverlay);
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeOverlay();
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') validateCode();
            if (event.key === 'Escape') closeOverlay();
        });
        setTimeout(function () { input.focus(); }, 20);
        return overlay;
    }

    function closeOverlay() {
        var overlay = document.getElementById('mikroAccessOverlay');
        if (overlay) overlay.remove();
        document.documentElement.classList.remove('mikro-access-hidden');
        state.pendingAction = null;
    }

    function completeUnlock() {
        var pending = state.pendingAction;
        state.pendingAction = null;
        var overlay = document.getElementById('mikroAccessOverlay');
        if (overlay) overlay.remove();
        document.documentElement.classList.remove('mikro-access-hidden');
        if (typeof pending === 'function') setTimeout(pending, 80);
    }

    function showMessage(text, ok) {
        var msg = document.getElementById('mikroAccessMsg');
        if (!msg) return;
        msg.style.color = ok ? '#86efac' : '#fca5a5';
        msg.textContent = text;
    }

    function removeSessionStatus() {
        var status = document.getElementById('mikroAccessStatus');
        if (status) status.remove();
        if (state.statusTimer) {
            clearInterval(state.statusTimer);
            state.statusTimer = null;
        }
    }

    function clearAccessSession() {
        localStorage.removeItem(ACCESS_KEY);
        removeSessionStatus();
    }

    function updateSessionStatus() {
        var session = readSession();
        if (!session || Number(session.expiresAt) <= now()) {
            clearAccessSession();
            return;
        }
        ensureStyles();
        var status = document.getElementById('mikroAccessStatus');
        if (!status) {
            status = document.createElement('div');
            status.id = 'mikroAccessStatus';
            status.setAttribute('role', 'status');
            status.innerHTML = '<div id="mikroAccessStatusTitle">اشتراكك مفعل</div><div id="mikroAccessStatusTimes"><span>استخدمت<strong id="mikroAccessUsed">00:00:00</strong></span><span>متبقي<strong id="mikroAccessRemaining">00:00:00</strong></span></div><div id="mikroAccessStatusExpiry"></div>';
            document.body.appendChild(status);
        }
        var unlockedAt = Date.parse(session.unlockedAt || '');
        var used = Number.isFinite(unlockedAt) ? now() - unlockedAt : 0;
        document.getElementById('mikroAccessUsed').textContent = formatDuration(used);
        document.getElementById('mikroAccessRemaining').textContent = formatDuration(Number(session.expiresAt) - now());
        document.getElementById('mikroAccessStatusExpiry').textContent = 'ينتهي في: ' + new Date(Number(session.expiresAt)).toLocaleString('ar-EG');
    }

    function renderSessionStatus() {
        updateSessionStatus();
        if (!state.statusTimer && readSession()) {
            state.statusTimer = setInterval(updateSessionStatus, 1000);
        }
    }

    async function validateCurrentSession() {
        var session = readSession();
        if (!session || Number(session.expiresAt) <= now()) {
            clearAccessSession();
            return { allowed: false, reason: 'expired' };
        }
        var config = cacheConfig(await loadFirestoreConfig());
        state.config = config;
        if (config.enabled === false) return { allowed: true, session: session, config: config };
        var match = config.codes.find(function (item) {
            return item && getCodeText(item.code) === getCodeText(session.code);
        });
        var codeExpiresAt = match ? Date.parse(match.expiresAt || '') : NaN;
        if (!match || match.active === false || (Number.isFinite(codeExpiresAt) && codeExpiresAt <= now())) {
            clearAccessSession();
            return { allowed: false, reason: 'revoked', config: config };
        }
        if (!codeAllowsPage(match)) return { allowed: false, reason: 'page', config: config };
        if (Number.isFinite(codeExpiresAt) && Number(session.expiresAt) > codeExpiresAt) {
            session.expiresAt = codeExpiresAt;
            localStorage.setItem(ACCESS_KEY, JSON.stringify(session));
            renderSessionStatus();
        }
        return { allowed: true, session: session, config: config };
    }

    async function monitorCurrentSession() {
        if (!readSession()) return;
        try { await validateCurrentSession(); }
        catch (error) { /* Keep the local timer visible during a temporary network interruption. */ }
    }

    async function validateCode() {
        if (state.loading) return;
        var input = document.getElementById('mikroAccessInput');
        var button = document.getElementById('mikroAccessBtn');
        var typed = getCodeText(input && input.value);
        if (!typed) { showMessage('اكتب الباسورد اولا'); return; }

        state.loading = true;
        if (button) { button.disabled = true; button.textContent = 'جاري التحقق...'; }
        try {
            state.config = cacheConfig(await loadFirestoreConfig());
            if (state.config.enabled === false) { completeUnlock(); return; }
            var match = state.config.codes.find(function (item) {
                return item && getCodeText(item.code) === typed;
            });
            if (!match) { showMessage('الباسورد غير صحيح'); return; }
            if (match.active === false) { showMessage('الباسورد غير مفعل'); return; }
            var codeExpiresAt = Date.parse(match.expiresAt || '');
            if (Number.isFinite(codeExpiresAt) && codeExpiresAt <= now()) {
                showMessage('انتهت صلاحية الباسورد');
                return;
            }
            if (!codeAllowsPage(match)) { showMessage('الباسورد صحيح لكنه غير مفعل لهذه الصفحة'); return; }

            var expiresAt = now() + Math.max(1, Number(state.config.durationHours || 24)) * 36e5;
            if (Number.isFinite(codeExpiresAt)) expiresAt = Math.min(expiresAt, codeExpiresAt);
            localStorage.setItem(ACCESS_KEY, JSON.stringify({
                code: typed,
                expiresAt: expiresAt,
                unlockedAt: new Date().toISOString(),
                scope: match.scope === 'all' || match.allPages === true ? 'all' : 'pages',
                pages: Array.isArray(match.pages) ? match.pages.map(normalizePage) : []
            }));
            renderSessionStatus();
            showMessage('تم التفعيل لمدة ' + formatLeft(expiresAt - now()), true);
            setTimeout(completeUnlock, 300);
        } catch (error) {
            showMessage('تعذر التحقق الآن، حاول مرة اخرى');
        } finally {
            state.loading = false;
            if (button) { button.disabled = false; button.textContent = 'فتح الميزة'; }
        }
    }

    async function requireAccess(action) {
        if (readSession()) {
            try {
                var sessionCheck = await validateCurrentSession();
                if (sessionCheck.allowed) {
                    if (typeof action === 'function') action();
                    return true;
                }
            } catch (error) {
                state.pendingAction = typeof action === 'function' ? action : null;
                createOverlay();
                showMessage('تعذر التأكد من حالة الاشتراك الآن، حاول مرة اخرى');
                return false;
            }
        }
        state.pendingAction = typeof action === 'function' ? action : null;
        try {
            state.config = cacheConfig(await loadFirestoreConfig());
            if (state.config.enabled === false) {
                completeUnlock();
                return true;
            }
            createOverlay();
        } catch (error) {
            createOverlay();
            showMessage('تعذر الاتصال بنظام الاشتراكات، حاول بعد قليل');
        }
        return false;
    }

    function installPaidActionGuard() {
        document.addEventListener('click', function (event) {
            var target = event.target && event.target.closest ? event.target.closest('[data-paid-action]') : null;
            if (!target) return;
            if (state.approvedTarget === target) {
                state.approvedTarget = null;
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            requireAccess(function () {
                state.approvedTarget = target;
                target.click();
            });
        }, true);
    }

    function boot() {
        installPaidActionGuard();
        renderSessionStatus();
        if (!state.monitorTimer) state.monitorTimer = setInterval(monitorCurrentSession, 10000);
        loadConfig().then(function (config) { state.config = config; }).catch(function () {});
    }

    window.MikroAccess = { require: requireAccess, hasAccess: hasValidSession };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
