// ═══════════════════════════════════════════════════════════
// FALCON AI — Live Chat Widget for Website
// Add to any page: <script src="live-chat.js"></script>
// Connects to the same GAS chat system as the Customer Dashboard
// Messages appear in Admin Console → Support Inbox
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';

    var GAS_URL = 'https://script.google.com/macros/s/AKfycbw4NbVvTCOI1ZKXw3NhaKDPQGyHWhk6ILinaZ32PtwTBHzsRMRr-njfllSmhKtUcmr9/exec';
    var STORAGE_KEY = 'falcon_livechat';
    var POLL_INTERVAL = 8000; // Poll for admin replies every 8 seconds
    var pollTimer = null;
    var isOpen = false;
    var chatData = null;

    // Load saved chat session
    function loadSession() {
        try { chatData = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(_) { chatData = null; }
        return chatData;
    }
    function saveSession(data) {
        chatData = data;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // ── Create Widget HTML ──
    function createWidget() {
        // Float button
        var btn = document.createElement('div');
        btn.id = 'fchat-btn';
        btn.innerHTML = '💬';
        btn.style.cssText = 'position:fixed;bottom:20px;right:86px;z-index:99999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#00ff88);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(0,217,255,0.4);transition:transform 0.2s;';
        btn.onmouseover = function() { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
        btn.onclick = toggleChat;
        document.body.appendChild(btn);

        // Unread badge
        var badge = document.createElement('div');
        badge.id = 'fchat-badge';
        badge.style.cssText = 'position:absolute;top:-2px;right:-2px;background:#ff4444;color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:none;align-items:center;justify-content:center;';
        btn.appendChild(badge);

        // Chat panel
        var panel = document.createElement('div');
        panel.id = 'fchat-panel';
        panel.style.cssText = 'position:fixed;bottom:86px;right:86px;z-index:99999;width:340px;max-height:480px;background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.5);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
        panel.innerHTML = ''
            + '<div style="padding:14px 16px;background:rgba(22,27,34,0.95);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;">'
            + '  <div style="display:flex;align-items:center;gap:8px;">'
            + '    <span style="font-size:16px;font-weight:900;background:linear-gradient(90deg,#00d9ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">◈ Falcon AI</span>'
            + '    <span style="font-size:10px;color:#5b6580;">Support</span>'
            + '  </div>'
            + '  <button id="fchat-close" style="background:none;border:none;color:#5b6580;font-size:18px;cursor:pointer;padding:0 4px;">✕</button>'
            + '</div>'
            + '<div id="fchat-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;min-height:250px;max-height:320px;"></div>'
            + '<div id="fchat-name-bar" style="display:none;padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);">'
            + '  <input id="fchat-name" type="text" placeholder="Your name" style="width:100%;padding:8px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#e6edf3;font-size:12px;outline:none;">'
            + '</div>'
            + '<div style="padding:10px 12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;">'
            + '  <label style="display:flex;align-items:center;cursor:pointer;padding:4px;" title="Attach file">'
            + '    <input type="file" id="fchat-file" accept="image/*,.pdf,.doc,.docx,.txt" style="display:none;" onchange="window._fchatFileChange(this)">'
            + '    <span style="font-size:18px;">📎</span>'
            + '  </label>'
            + '  <input id="fchat-input" type="text" placeholder="Type a message..." style="flex:1;padding:9px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e6edf3;font-size:13px;outline:none;font-family:inherit;">'
            + '  <button id="fchat-send" style="background:linear-gradient(135deg,#00d9ff,#00ff88);border:none;color:#0d1117;font-weight:700;font-size:12px;padding:9px 14px;border-radius:8px;cursor:pointer;">Send</button>'
            + '</div>'
            + '<div id="fchat-file-name" style="padding:0 12px 6px;font-size:10px;color:#00d9ff;display:none;"></div>';

        // File selection handler with remove option
        window._fchatFileChange = function(input) {
            var el = document.getElementById('fchat-file-name');
            if (input.files && input.files[0]) {
                el.style.display = 'block';
                el.innerHTML = '📎 ' + input.files[0].name + ' <span onclick="window._fchatClearFile()" style="cursor:pointer;color:#ff6b6b;margin-left:8px;font-weight:700;">✕</span>';
            } else {
                el.style.display = 'none';
                el.innerHTML = '';
            }
        };
        window._fchatClearFile = function() {
            var fileInput = document.getElementById('fchat-file');
            if (fileInput) fileInput.value = '';
            var el = document.getElementById('fchat-file-name');
            if (el) { el.style.display = 'none'; el.innerHTML = ''; }
        };
        document.body.appendChild(panel);

        // Events
        document.getElementById('fchat-close').onclick = toggleChat;
        document.getElementById('fchat-send').onclick = sendMessage;
        document.getElementById('fchat-input').onkeydown = function(e) { if (e.key === 'Enter') sendMessage(); };

        // Check if user needs to enter name
        var session = loadSession();
        if (!session || !session.token) {
            showNameBar();
            showWelcome();
        } else {
            hideNameBar();
            loadMessages();
        }
    }

    function toggleChat() {
        isOpen = !isOpen;
        var panel = document.getElementById('fchat-panel');
        panel.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) {
            var session = loadSession();
            if (session && session.token) {
                loadMessages();
                startPolling();
            }
            // Hide badge
            document.getElementById('fchat-badge').style.display = 'none';
        } else {
            stopPolling();
        }
    }

    function showNameBar() {
        document.getElementById('fchat-name-bar').style.display = 'block';
    }
    function hideNameBar() {
        document.getElementById('fchat-name-bar').style.display = 'none';
    }

    function showWelcome() {
        var el = document.getElementById('fchat-messages');
        el.innerHTML = '<div style="background:rgba(0,217,255,0.06);border:1px solid rgba(0,217,255,0.15);border-radius:10px;padding:12px;font-size:12px;color:#8b94a8;">'
            + '<p style="color:#e6edf3;font-weight:600;margin-bottom:6px;">👋 Welcome to Falcon AI Support!</p>'
            + '<p>Enter your name above and type your message below. Our team typically responds within a few minutes.</p>'
            + '</div>';
    }

    function renderMessages(messages) {
        var el = document.getElementById('fchat-messages');
        var html = '';
        if (!messages || !messages.length) {
            html = '<div style="text-align:center;color:#5b6580;font-size:11px;padding:20px;">No messages yet. Send one to start!</div>';
        } else {
            messages.forEach(function(m) {
                var isAdmin = m.direction === 'admin_to_customer';
                var align = isAdmin ? 'margin-right:auto;background:rgba(0,217,255,0.08);border:1px solid rgba(0,217,255,0.15);' : 'margin-left:auto;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.15);';
                html += '<div style="max-width:80%;padding:8px 12px;border-radius:10px;font-size:12px;' + align + '">';
                html += '<div style="font-size:9px;color:#5b6580;margin-bottom:3px;">' + (isAdmin ? '🛡️ Support' : '👤 You') + ' • ' + (m.created_at || '').slice(11, 16) + '</div>';
                html += '<div style="color:#e6edf3;word-wrap:break-word;">' + (m.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
                html += '</div>';
            });
        }
        el.innerHTML = html;
        el.scrollTop = el.scrollHeight;
    }

    function loadMessages() {
        var session = loadSession();
        if (!session || !session.token) return;

        fetch(GAS_URL + '?token=' + encodeURIComponent(session.token) + '&command=chat_poll&source=web_cmd&t=' + Date.now(), { method: 'GET', mode: 'cors' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.status === 'ok') {
                var msgs = data.messages || data.thread || [];
                renderMessages(msgs);
                // Check for unread admin messages
                if (!isOpen) {
                    var unread = msgs.filter(function(m) { return m.direction === 'admin_to_customer' && !m.read_by_customer; }).length;
                    if (unread > 0) {
                        var badge = document.getElementById('fchat-badge');
                        badge.textContent = unread;
                        badge.style.display = 'flex';
                    }
                }
            }
        }).catch(function() {});
    }

    function sendMessage() {
        var input = document.getElementById('fchat-input');
        var body = input.value.trim();
        if (!body) return;

        var session = loadSession();

        // First message — need to get/create token
        if (!session || !session.token) {
            var nameInput = document.getElementById('fchat-name');
            var name = (nameInput.value || '').trim() || 'Website Visitor';

            // Use a stored config token if user is logged in
            var cfg = {};
            try { cfg = JSON.parse(localStorage.getItem('falconConfig') || '{}'); } catch(_) {}

            if (cfg.secretToken) {
                // Logged-in user — use their real token
                session = { token: cfg.secretToken, name: name, endpoint: cfg.endpointUrl || GAS_URL };
                saveSession(session);
                hideNameBar();
                doSend(session, body, name);
            } else {
                // Not logged in — create a temporary visitor session
                // Use a generated visitor token (GAS will reject it for sub_get_status but chat_send works differently)
                // Actually, chat_send requires a valid token. Show login prompt instead.
                var el = document.getElementById('fchat-messages');
                el.innerHTML = '<div style="background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.2);border-radius:10px;padding:12px;font-size:12px;color:#ffc107;">'
                    + '<p style="font-weight:600;margin-bottom:6px;">🔑 Login Required</p>'
                    + '<p style="color:#8b94a8;">To chat with support, please <a href="login.html" style="color:#00d9ff;">log in</a> or <a href="register.html" style="color:#00d9ff;">create an account</a> first.</p>'
                    + '<p style="color:#8b94a8;margin-top:8px;">Already have an account? Your chat will appear in your dashboard after login.</p>'
                    + '</div>';
                return;
            }
        } else {
            doSend(session, body, session.name);
        }
    }

    function doSend(session, body, senderName) {
        var input = document.getElementById('fchat-input');
        var fileInput = document.getElementById('fchat-file');
        input.value = '';
        input.disabled = true;

        var url = session.endpoint || GAS_URL;

        // Check if file is attached
        if (fileInput && fileInput.files && fileInput.files[0]) {
            var file = fileInput.files[0];
            if (file.size > 500000) { // 500KB max for GET-based upload
                alert('File too large for live chat. Maximum 500KB. Use the dashboard for larger files.');
                input.disabled = false;
                fileInput.value = '';
                document.getElementById('fchat-file-name').textContent = '';
                return;
            }
            var reader = new FileReader();
            reader.onload = function() {
                var b64 = reader.result;
                // Use GET with encoded params (same as text messages — avoids CORS POST issues)
                var params = 'token=' + encodeURIComponent(session.token)
                    + '&command=chat_send&source=web_cmd'
                    + '&body=' + encodeURIComponent('[File: ' + file.name + '] ' + (body || ''))
                    + '&sender_name=' + encodeURIComponent(senderName || 'Customer')
                    + '&t=' + Date.now();

                fetch(url + '?' + params, { method: 'GET', mode: 'cors' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    input.disabled = false;
                    fileInput.value = '';
                    document.getElementById('fchat-file-name').textContent = '';
                    if (data && data.status === 'ok') { loadMessages(); startPolling(); }
                    else alert('Failed to send. Try again.');
                }).catch(function() { input.disabled = false; alert('Cannot reach server.'); });
            };
            reader.readAsDataURL(file);
            return;
        }

        // Text-only message (original flow)
        var params = 'token=' + encodeURIComponent(session.token)
            + '&command=chat_send&source=web_cmd'
            + '&body=' + encodeURIComponent(body)
            + '&sender_name=' + encodeURIComponent(senderName || 'Customer')
            + '&t=' + Date.now();

        fetch(url + '?' + params, { method: 'GET', mode: 'cors' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            input.disabled = false;
            if (data && data.status === 'ok') {
                loadMessages();
                startPolling();
            } else {
                alert('Failed to send message. Please try again.');
            }
        }).catch(function() {
            input.disabled = false;
            alert('Cannot reach server. Check your connection.');
        });
    }

    function startPolling() {
        stopPolling();
        pollTimer = setInterval(loadMessages, POLL_INTERVAL);
    }
    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    // ── Initialize ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
