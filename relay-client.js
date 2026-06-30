/**
 * Falcon AI — WebSocket Relay Client (Shared)
 * =============================================
 * Include this script in both ADMIN_DASHBORED.html and admin-console.html.
 * Provides real-time WebSocket connection to the Falcon Relay Server.
 * 
 * Usage:
 *   FalconRelay.connect(url, masterToken, device);
 *   FalconRelay.sendCommand(action, target, params);
 *   FalconRelay.onEvent(type, callback);
 *   FalconRelay.disconnect();
 */

var FalconRelay = (function() {
    var ws = null;
    var connected = false;
    var authenticated = false;
    var sessionId = null;
    var reconnectTimer = null;
    var reconnectAttempts = 0;
    var maxReconnectDelay = 30000; // 30s max backoff
    var config = { url: '', masterToken: '', device: 'unknown' };
    var listeners = {}; // type -> [callbacks]
    var heartbeatTimer = null;

    // ── Event System ──
    function on(type, callback) {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(callback);
    }

    function emit(type, data) {
        if (listeners[type]) {
            listeners[type].forEach(function(cb) {
                try { cb(data); } catch(e) { console.error('[Relay] Listener error:', e); }
            });
        }
        // Also emit to wildcard listeners
        if (listeners['*']) {
            listeners['*'].forEach(function(cb) {
                try { cb(type, data); } catch(e) {}
            });
        }
    }

    // ── Connection ──
    function connect(url, masterToken, device) {
        config.url = url;
        config.masterToken = masterToken;
        config.device = device || 'unknown';

        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            console.log('[Relay] Already connected/connecting');
            return;
        }

        try {
            ws = new WebSocket(url);
        } catch(e) {
            console.error('[Relay] WebSocket creation failed:', e);
            scheduleReconnect();
            return;
        }

        ws.onopen = function() {
            console.log('[Relay] Connected to relay server');
            connected = true;
            reconnectAttempts = 0;
            emit('connection', { status: 'connected' });

            // Send AUTH immediately
            ws.send(JSON.stringify({
                type: 'AUTH',
                master_token: config.masterToken,
                device: config.device
            }));

            // Start heartbeat (keep-alive ping every 25s)
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            heartbeatTimer = setInterval(function() {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'PING' }));
                }
            }, 25000);
        };

        ws.onmessage = function(event) {
            var msg;
            try { msg = JSON.parse(event.data); } catch(_) { return; }

            // Handle specific message types
            switch(msg.type) {
                case 'AUTH_OK':
                    authenticated = true;
                    sessionId = msg.session_id;
                    console.log('[Relay] Authenticated as ' + config.device + ' (session: ' + sessionId + ')');
                    emit('authenticated', msg);
                    break;

                case 'AUTH_FAILED':
                    authenticated = false;
                    console.error('[Relay] Authentication failed:', msg.error);
                    emit('auth_failed', msg);
                    break;

                case 'STATE_SNAPSHOT':
                    emit('state_snapshot', msg);
                    break;

                case 'EA_HEARTBEAT':
                    emit('ea_heartbeat', msg);
                    break;

                case 'EA_OFFLINE':
                    emit('ea_offline', msg);
                    break;

                case 'CMD_ACK':
                    emit('cmd_ack', msg);
                    break;

                case 'CMD_DELIVERED':
                    emit('cmd_delivered', msg);
                    break;

                case 'CMD_EXECUTED':
                    emit('cmd_executed', msg);
                    break;

                case 'PONG':
                    // Keep-alive response, no action needed
                    break;

                case 'ERROR':
                    console.warn('[Relay] Server error:', msg.error);
                    emit('error', msg);
                    break;

                default:
                    emit(msg.type, msg);
            }

            // Always emit raw message to wildcard
            emit('message', msg);
        };

        ws.onclose = function(event) {
            connected = false;
            authenticated = false;
            sessionId = null;
            if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
            console.log('[Relay] Disconnected (code: ' + event.code + ')');
            emit('connection', { status: 'disconnected', code: event.code });

            // Auto-reconnect (unless intentionally closed)
            if (event.code !== 4000) { // 4000 = intentional close
                scheduleReconnect();
            }
        };

        ws.onerror = function(err) {
            console.error('[Relay] WebSocket error');
            emit('error', { error: 'connection_error' });
        };
    }

    function disconnect() {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        if (ws) {
            ws.close(4000, 'Intentional disconnect');
            ws = null;
        }
        connected = false;
        authenticated = false;
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectAttempts++;
        var delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
        console.log('[Relay] Reconnecting in ' + (delay/1000) + 's (attempt ' + reconnectAttempts + ')');
        emit('connection', { status: 'reconnecting', attempt: reconnectAttempts, delay: delay });
        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            connect(config.url, config.masterToken, config.device);
        }, delay);
    }

    // ── Send Command ──
    function sendCommand(action, target, params) {
        if (!authenticated || !ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[Relay] Cannot send command — not connected/authenticated');
            emit('error', { error: 'not_connected', action: action });
            return false;
        }
        ws.send(JSON.stringify({
            type: 'COMMAND',
            action: action,
            target: target || '*',
            params: params || {}
        }));
        return true;
    }

    // ── Request State ──
    function requestState() {
        if (!authenticated || !ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify({ type: 'GET_STATE' }));
        return true;
    }

    // ── Public API ──
    return {
        connect: connect,
        disconnect: disconnect,
        sendCommand: sendCommand,
        requestState: requestState,
        onEvent: on,
        isConnected: function() { return connected && authenticated; },
        getSessionId: function() { return sessionId; },
        getConfig: function() { return { url: config.url, device: config.device }; }
    };
})();
