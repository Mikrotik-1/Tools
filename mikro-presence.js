(function () {
    'use strict';

    var blockedPages = ['admin.html', 'telegram-setup.html', 'get-chat-id.html', 'mikro-icons.html'];
    var path = (location.pathname || '').split('/').pop() || 'index.html';
    if (blockedPages.indexOf(path) !== -1) return;

    var FIREBASE_API_KEY = 'AIzaSyAfgN8SAIhSU3AN-Az2Kzw2EP-XpptEsN4';
    var FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/mikro-tools/databases/(default)/documents/problems/';
    var VISITOR_KEY = 'mikrotools_visitor_id';
    var SESSION_KEY = 'mikrotools_presence_id';
    var FIRST_SEEN_KEY = 'mikrotools_presence_first_seen';
    var HEARTBEAT_INTERVAL = 30000;
    var REQUEST_TIMEOUT = 7000;
    var heartbeatTimer = null;
    var isSending = false;

    function uid(prefix) {
        return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    function getOrCreate(key, prefix) {
        var value = localStorage.getItem(key);
        if (!value) {
            value = uid(prefix);
            localStorage.setItem(key, value);
        }
        return value;
    }

    function getFirstSeen() {
        var value = localStorage.getItem(FIRST_SEEN_KEY);
        if (!value) {
            value = new Date().toISOString();
            localStorage.setItem(FIRST_SEEN_KEY, value);
        }
        return value;
    }

    function getDeviceType() {
        var width = window.innerWidth || screen.width || 1024;
        if (width <= 767) return 'موبايل';
        if (width <= 1024) return 'تابلت';
        return 'كمبيوتر';
    }

    function firestoreFields(active, nowIso, sessionId, visitorId) {
        return {
            kind: { stringValue: 'mikro_presence' },
            id: { stringValue: sessionId },
            visitorId: { stringValue: visitorId },
            page: { stringValue: document.title || path },
            path: { stringValue: path },
            url: { stringValue: location.pathname || '/' + path },
            device: { stringValue: getDeviceType() },
            language: { stringValue: document.documentElement.lang || navigator.language || 'ar' },
            firstSeen: { stringValue: getFirstSeen() },
            lastSeen: { stringValue: nowIso },
            active: { booleanValue: active !== false }
        };
    }

    async function heartbeat(active) {
        if (isSending && active !== false) return;
        isSending = true;
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT);
        var sessionId = getOrCreate(SESSION_KEY, 'session');
        var visitorId = getOrCreate(VISITOR_KEY, 'visitor');
        var documentId = 'mikro_presence_' + sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
        var url = FIRESTORE_BASE + encodeURIComponent(documentId) + '?key=' + FIREBASE_API_KEY;

        try {
            var options = {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: firestoreFields(active, new Date().toISOString(), sessionId, visitorId) }),
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

    function startPresence() {
        heartbeat(true);
        heartbeatTimer = setInterval(function () { heartbeat(true); }, HEARTBEAT_INTERVAL);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') heartbeat(true);
    });
    window.addEventListener('pagehide', function () { heartbeat(false); });

    if (document.readyState === 'complete') startPresence();
    else window.addEventListener('load', startPresence, { once: true });

    window.MikroToolsPresence = {
        refresh: function () { return heartbeat(true); },
        stop: function () {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            return heartbeat(false);
        }
    };
})();
