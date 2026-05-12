(function () {
    'use strict';

    var blockedPages = ['admin.html', 'telegram-setup.html', 'get-chat-id.html', 'mikro-icons.html'];
    var path = (location.pathname || '').split('/').pop() || 'index.html';
    if (blockedPages.indexOf(path) !== -1) return;

    var BIN_ID = '6984fe4d43b1c97be9684aa8';
    var API_KEY = '$2a$10$sDP72/VHq2TmDVYz8R1P1uwCbqVkDiIKs9yAeh0hxrEHnKnggxa0G';
    var API_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID;
    var VISITOR_KEY = 'mikrotools_visitor_id';
    var SESSION_KEY = 'mikrotools_session_id';
    var HEARTBEAT_INTERVAL = 45000;
    var ONLINE_TIMEOUT = 120000;
    var heartbeatTimer = null;
    var isSending = false;

    function uid(prefix) {
        return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    }

    function getOrCreate(key, prefix) {
        var value = localStorage.getItem(key);
        if (!value) {
            value = uid(prefix);
            localStorage.setItem(key, value);
        }
        return value;
    }

    function getDeviceType() {
        var w = window.innerWidth || screen.width || 1024;
        if (w <= 767) return 'موبايل';
        if (w <= 1024) return 'تابلت';
        return 'كمبيوتر';
    }

    function normalizeRecord(record) {
        record = record || {};
        record.analytics = record.analytics || {};
        record.analytics.pages = record.analytics.pages || {};
        record.analytics.daily = record.analytics.daily || {};
        record.analytics.activeSessions = record.analytics.activeSessions || {};
        return record;
    }

    function cleanupSessions(sessions, now) {
        Object.keys(sessions || {}).forEach(function (key) {
            var lastSeen = new Date(sessions[key].lastSeen || 0).getTime();
            if (!lastSeen || now - lastSeen > ONLINE_TIMEOUT) delete sessions[key];
        });
    }

    async function heartbeat(active) {
        if (isSending) return;
        isSending = true;
        var now = Date.now();
        var nowIso = new Date(now).toISOString();
        var visitorId = getOrCreate(VISITOR_KEY, 'visitor');
        var sessionId = getOrCreate(SESSION_KEY, 'session');

        try {
            var response = await fetch(API_URL + '/latest', {
                headers: { 'X-Master-Key': API_KEY },
                cache: 'no-cache'
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var data = await response.json();
            var record = normalizeRecord(data.record);
            var sessions = record.analytics.activeSessions;

            cleanupSessions(sessions, now);
            if (active === false) {
                delete sessions[sessionId];
            } else {
                sessions[sessionId] = {
                    id: sessionId,
                    visitorId: visitorId,
                    page: document.title || path,
                    path: path,
                    url: location.pathname,
                    device: getDeviceType(),
                    language: document.documentElement.lang || navigator.language || 'ar',
                    firstSeen: sessions[sessionId]?.firstSeen || nowIso,
                    lastSeen: nowIso
                };
            }

            var activeList = Object.values(sessions);
            record.analytics.liveNow = activeList.length;
            record.analytics.currentOnline = activeList.length;
            record.analytics.activeVisitors = activeList.length;
            record.analytics.currentPages = activeList.reduce(function (acc, item) {
                acc[item.path || item.page || 'unknown'] = (acc[item.path || item.page || 'unknown'] || 0) + 1;
                return acc;
            }, {});
            record.analytics.liveActivity = activeList
                .sort(function (a, b) { return new Date(b.lastSeen) - new Date(a.lastSeen); })
                .slice(0, 30);
            record.analytics.lastPresenceUpdate = nowIso;

            await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY,
                    'X-Bin-Versioning': 'false'
                },
                body: JSON.stringify(record),
                keepalive: active === false
            });
        } catch (error) {
            if (window.console) console.warn('MikroTools presence skipped:', error.message);
        } finally {
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
    window.addEventListener('beforeunload', function () { heartbeat(false); });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPresence);
    } else {
        startPresence();
    }

    window.MikroToolsPresence = {
        refresh: function () { return heartbeat(true); },
        stop: function () {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            return heartbeat(false);
        }
    };
})();
