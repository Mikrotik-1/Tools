(function () {
    'use strict';

    var blockedPages = ['admin.html', 'telegram-setup.html', 'get-chat-id.html', 'mikro-icons.html'];
    var path = (location.pathname || '').split('/').pop() || 'index.html';
    if (blockedPages.indexOf(path) !== -1) return;

    var FIREBASE_API_KEY = 'AIzaSyAfgN8SAIhSU3AN-Az2Kzw2EP-XpptEsN4';
    var FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/mikro-tools/databases/(default)/documents/problems/';
    var VISITOR_KEY = 'mikrotools_visitor_id';
    var FIRST_SEEN_KEY = 'mikrotools_presence_first_seen';
    var SESSION_KEY = 'mikrotools_presence_session_id';
    var SESSION_STARTED_KEY = 'mikrotools_presence_started_at';
    var SESSION_EVENTS_KEY = 'mikrotools_presence_events';
    var SESSION_PAGES_KEY = 'mikrotools_presence_pages';
    var HEARTBEAT_INTERVAL = 30000;
    var REQUEST_TIMEOUT = 7000;
    var MAX_EVENTS = 50;
    var MAX_PAGES = 30;
    var heartbeatTimer = null;
    var sendTimer = null;
    var isSending = false;

    function storageGet(storage, key) {
        try { return storage.getItem(key); } catch (error) { return null; }
    }

    function storageSet(storage, key, value) {
        try { storage.setItem(key, value); } catch (error) {}
    }

    function uid(prefix) {
        return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function getOrCreate(storage, key, prefix) {
        var value = storageGet(storage, key);
        if (!value) {
            value = uid(prefix);
            storageSet(storage, key, value);
        }
        return value;
    }

    function getFirstSeen() {
        var value = storageGet(localStorage, FIRST_SEEN_KEY);
        if (!value) {
            value = new Date().toISOString();
            storageSet(localStorage, FIRST_SEEN_KEY, value);
        }
        return value;
    }

    function getSessionStarted() {
        var value = storageGet(sessionStorage, SESSION_STARTED_KEY);
        if (!value) {
            value = new Date().toISOString();
            storageSet(sessionStorage, SESSION_STARTED_KEY, value);
        }
        return value;
    }

    function parseList(key) {
        try {
            var parsed = JSON.parse(storageGet(sessionStorage, key) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    var visitorId = getOrCreate(localStorage, VISITOR_KEY, 'visitor');
    var sessionId = getOrCreate(sessionStorage, SESSION_KEY, 'session');
    var sessionStarted = getSessionStarted();
    var events = parseList(SESSION_EVENTS_KEY);
    var pages = parseList(SESSION_PAGES_KEY);
    var referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).hostname : 'مباشر'; } catch (error) { referrer = 'مباشر'; }

    function safeText(value, maxLength) {
        return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 90);
    }

    function getDeviceType() {
        var width = window.innerWidth || screen.width || 1024;
        if (width <= 767) return 'موبايل';
        if (width <= 1024) return 'تابلت';
        return 'كمبيوتر';
    }

    function getBrowser() {
        var ua = navigator.userAgent || '';
        if (/Edg\//.test(ua)) return 'Edge';
        if (/OPR\//.test(ua)) return 'Opera';
        if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
        if (/FxiOS|Firefox\//.test(ua)) return 'Firefox';
        if (/Safari\//.test(ua)) return 'Safari';
        return 'متصفح آخر';
    }

    function getOS() {
        var ua = navigator.userAgent || '';
        if (/Android/i.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
        if (/Windows/i.test(ua)) return 'Windows';
        if (/Mac OS/i.test(ua)) return 'macOS';
        if (/Linux/i.test(ua)) return 'Linux';
        return 'نظام آخر';
    }

    function getCampaign() {
        try {
            var params = new URLSearchParams(location.search);
            return {
                source: safeText(params.get('utm_source'), 50),
                medium: safeText(params.get('utm_medium'), 50),
                campaign: safeText(params.get('utm_campaign'), 70)
            };
        } catch (error) {
            return { source: '', medium: '', campaign: '' };
        }
    }

    function pageTitle() {
        return safeText(document.title || path, 120);
    }

    function saveSessionLists() {
        storageSet(sessionStorage, SESSION_EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
        storageSet(sessionStorage, SESSION_PAGES_KEY, JSON.stringify(pages.slice(-MAX_PAGES)));
    }

    function registerPage() {
        var last = pages.length ? pages[pages.length - 1] : null;
        if (!last || last.path !== path) {
            pages.push({ path: path, title: pageTitle(), enteredAt: new Date().toISOString() });
            if (pages.length > MAX_PAGES) pages = pages.slice(-MAX_PAGES);
            saveSessionLists();
        }
    }

    function track(action, label) {
        var item = {
            at: new Date().toISOString(),
            action: safeText(action, 40),
            label: safeText(label, 100),
            path: path
        };
        events.push(item);
        if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
        saveSessionLists();
        scheduleHeartbeat();
        return item;
    }

    function lastEvent() {
        return events.length ? events[events.length - 1] : null;
    }

    function durationSeconds() {
        var started = new Date(sessionStarted).getTime();
        return started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
    }

    function stringField(value) {
        return { stringValue: String(value == null ? '' : value) };
    }

    function integerField(value) {
        return { integerValue: String(Math.max(0, Math.round(Number(value) || 0))) };
    }

    function firestoreFields(active, nowIso) {
        var last = lastEvent() || {};
        var campaign = getCampaign();
        return {
            kind: stringField('mikro_presence'),
            id: stringField(sessionId),
            visitorId: stringField(visitorId),
            page: stringField(pageTitle()),
            path: stringField(path),
            device: stringField(getDeviceType()),
            browser: stringField(getBrowser()),
            os: stringField(getOS()),
            screen: stringField((screen.width || 0) + 'x' + (screen.height || 0)),
            viewport: stringField((window.innerWidth || 0) + 'x' + (window.innerHeight || 0)),
            language: stringField(document.documentElement.lang || navigator.language || 'ar'),
            referrer: stringField(referrer || 'مباشر'),
            campaignSource: stringField(campaign.source),
            campaignMedium: stringField(campaign.medium),
            campaignName: stringField(campaign.campaign),
            firstSeen: stringField(getFirstSeen()),
            sessionStarted: stringField(sessionStarted),
            lastSeen: stringField(nowIso),
            lastAction: stringField(last.action || 'page_view'),
            lastActionLabel: stringField(last.label || pageTitle()),
            lastActionAt: stringField(last.at || sessionStarted),
            eventCount: integerField(events.length),
            pageCount: integerField(pages.length),
            clickCount: integerField(events.filter(function (event) { return event.action === 'click'; }).length),
            durationSeconds: integerField(durationSeconds()),
            eventsJson: stringField(JSON.stringify(events.slice(-MAX_EVENTS))),
            pagesJson: stringField(JSON.stringify(pages.slice(-MAX_PAGES))),
            signedIn: { booleanValue: !!(window._auth && window._auth.currentUser) },
            active: { booleanValue: active !== false }
        };
    }

    async function heartbeat(active) {
        if (isSending && active !== false) return;
        isSending = true;
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT);
        var documentId = 'mikro_presence_' + sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
        var url = FIRESTORE_BASE + encodeURIComponent(documentId) + '?key=' + FIREBASE_API_KEY;

        try {
            var options = {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: firestoreFields(active, new Date().toISOString()) }),
                keepalive: active === false
            };
            if (active !== false) options.signal = controller.signal;
            var response = await fetch(url, options);
            if (!response.ok) throw new Error('Firestore HTTP ' + response.status);
        } catch (error) {
            if (window.console) console.warn('MikroTools presence skipped:', error.message);
        } finally {
            clearTimeout(timeoutId);
            isSending = false;
        }
    }

    function scheduleHeartbeat() {
        clearTimeout(sendTimer);
        sendTimer = setTimeout(function () { heartbeat(true); }, 650);
    }

    function classifyClick(element) {
        var label = element.getAttribute('data-template') ||
            element.getAttribute('data-method') ||
            element.getAttribute('data-tab') ||
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.textContent;
        label = safeText(label, 100) || element.id || element.tagName.toLowerCase();
        var test = (element.id + ' ' + element.className + ' ' + label).toLowerCase();
        if (/download|تحميل|save|حفظ|print|طباعة/.test(test)) return 'download';
        if (/template|قالب/.test(test) || element.hasAttribute('data-template')) return 'template_select';
        if (/login|signin|تسجيل الدخول/.test(test)) return 'login_action';
        if (/logout|signout|تسجيل الخروج/.test(test)) return 'logout_action';
        if (element.tagName === 'A') return 'navigate';
        return 'click';
    }

    function bindActivityTracking() {
        document.addEventListener('click', function (event) {
            var element = event.target && event.target.closest ? event.target.closest('button,a,[data-template],[data-method],[data-tab],[role="button"]') : null;
            if (!element) return;
            var label = element.getAttribute('data-template') ||
                element.getAttribute('data-method') ||
                element.getAttribute('data-tab') ||
                element.getAttribute('aria-label') ||
                element.getAttribute('title') ||
                element.textContent;
            track(classifyClick(element), label);
        }, true);

        document.addEventListener('submit', function (event) {
            var form = event.target;
            track('form_submit', form.id || form.getAttribute('name') || form.getAttribute('action') || 'form');
        }, true);
    }

    function startPresence() {
        registerPage();
        if (!events.length) track('page_view', pageTitle());
        bindActivityTracking();
        heartbeat(true);
        heartbeatTimer = setInterval(function () { heartbeat(true); }, HEARTBEAT_INTERVAL);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') heartbeat(true);
        else heartbeat(false);
    });
    window.addEventListener('pagehide', function () { heartbeat(false); });

    if (document.readyState === 'complete') startPresence();
    else window.addEventListener('load', startPresence, { once: true });

    window.MikroToolsPresence = {
        track: track,
        refresh: function () { return heartbeat(true); },
        stop: function () {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            clearTimeout(sendTimer);
            return heartbeat(false);
        }
    };
})();
