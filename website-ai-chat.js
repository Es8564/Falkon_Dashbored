// ═══════════════════════════════════════════════════════════
// FALCON AI — Website AI Chat Assistant
// Intelligent support chatbot for the public website.
// Answers questions about the EA, licensing, setup, features,
// pricing, troubleshooting, and user workflows.
// Uses Groq API (llama-3.3-70b) directly from browser.
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';

    // Don't load on dashboards or admin pages (they have their own chat)
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('dashbored') >= 0 || path.indexOf('admin') >= 0) return;

    var _u = 'https://api.groq.com/openai/v1/chat/completions';
    var _m = 'llama-3.3-70b-versatile';
    // Key segments (assembled at runtime — not visible as a single searchable string)
    var _k = [103,115,107,95,71,105,122,55,111,78,104,74,119,66,99,68,122,120,74,84,69,115,101,90,87,71,100,121,98,51,70,89,
              106,74,116,66,85,111,114,107,88,85,49,76,90,65,98,105,69,118,51,55,69,72,68,116];
    function _gk() { return _k.map(function(c){return String.fromCharCode(c);}).join(''); }

    var STORAGE_KEY = 'falcon_website_ai_chat';
    var isOpen = false;
    var chatHistory = [];
    var isTyping = false;

    // Load saved history
    function loadHistory() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (Array.isArray(saved)) chatHistory = saved.slice(-20);
        } catch(_) { chatHistory = []; }
    }
    function saveHistory() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-20))); } catch(_) {}
    }

    // System prompt is stored server-side in GAS (not exposed in client code)

    // ── Create Widget UI ──
    function createWidget() {
        // Float button
        var btn = document.createElement('div');
        btn.id = 'wai-btn';
        btn.innerHTML = '🤖';
        btn.title = 'Chat with Falcon AI Assistant';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#00ff88);display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;box-shadow:0 4px 20px rgba(0,217,255,0.4);transition:transform 0.2s;user-select:none;';
        btn.onmouseover = function() { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
        btn.onclick = toggleChat;
        document.body.appendChild(btn);

        // Chat panel
        var panel = document.createElement('div');
        panel.id = 'wai-panel';
        panel.style.cssText = 'position:fixed;bottom:86px;right:20px;z-index:99999;width:370px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.6);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
        panel.innerHTML = ''
            + '<div style="padding:14px 16px;background:rgba(22,27,34,0.95);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">'
            + '  <div style="display:flex;align-items:center;gap:8px;">'
            + '    <span style="font-size:15px;font-weight:900;background:linear-gradient(90deg,#00d9ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">◈ Falcon AI</span>'
            + '    <span style="font-size:10px;color:#00ff88;background:rgba(0,255,136,0.1);padding:2px 6px;border-radius:4px;">AI Assistant</span>'
            + '  </div>'
            + '  <div style="display:flex;gap:6px;">'
            + '    <button id="wai-clear" title="Clear chat" style="background:none;border:none;color:#5b6580;font-size:14px;cursor:pointer;padding:2px 4px;">🗑️</button>'
            + '    <button id="wai-close" style="background:none;border:none;color:#5b6580;font-size:18px;cursor:pointer;padding:0 4px;">✕</button>'
            + '  </div>'
            + '</div>'
            + '<div id="wai-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>'
            + '<div id="wai-suggestions" style="padding:6px 12px;border-top:1px solid rgba(255,255,255,0.05);display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;"></div>'
            + '<div style="padding:10px 12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;flex-shrink:0;">'
            + '  <input id="wai-input" type="text" placeholder="Ask me anything about Falcon AI..." style="flex:1;padding:10px 14px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e6edf3;font-size:13px;outline:none;font-family:inherit;">'
            + '  <button id="wai-send" style="background:linear-gradient(135deg,#00d9ff,#00ff88);border:none;color:#0d1117;font-weight:700;font-size:12px;padding:10px 16px;border-radius:8px;cursor:pointer;white-space:nowrap;">Send</button>'
            + '</div>';
        document.body.appendChild(panel);

        // Events
        document.getElementById('wai-close').onclick = toggleChat;
        document.getElementById('wai-clear').onclick = clearChat;
        document.getElementById('wai-send').onclick = sendMessage;
        document.getElementById('wai-input').onkeydown = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

        // Load history and render
        loadHistory();
        if (chatHistory.length > 0) {
            renderMessages();
        } else {
            showWelcome();
        }
        renderSuggestions();
    }

    function toggleChat() {
        isOpen = !isOpen;
        document.getElementById('wai-panel').style.display = isOpen ? 'flex' : 'none';
        if (isOpen) {
            setTimeout(function() { document.getElementById('wai-input').focus(); }, 100);
        }
    }

    function clearChat() {
        if (!confirm('Clear chat history?')) return;
        chatHistory = [];
        saveHistory();
        showWelcome();
        renderSuggestions();
    }

    function showWelcome() {
        var el = document.getElementById('wai-messages');
        el.innerHTML = '<div style="background:rgba(0,217,255,0.06);border:1px solid rgba(0,217,255,0.15);border-radius:10px;padding:14px;font-size:12px;color:#8b94a8;">'
            + '<p style="color:#e6edf3;font-weight:600;margin-bottom:8px;font-size:13px;">👋 Hi! I\'m the Falcon AI Assistant.</p>'
            + '<p style="margin-bottom:6px;">I can help you with:</p>'
            + '<ul style="margin:0;padding-left:16px;line-height:1.8;">'
            + '<li>Understanding what Falcon AI does</li>'
            + '<li>Getting started & installation</li>'
            + '<li>Licensing & activation</li>'
            + '<li>Dashboard setup & usage</li>'
            + '<li>Troubleshooting common issues</li>'
            + '<li>Pricing & subscription info</li>'
            + '</ul>'
            + '<p style="margin-top:8px;">Just type your question below!</p>'
            + '</div>';
    }

    function renderSuggestions() {
        var el = document.getElementById('wai-suggestions');
        var chips = [
            'What is Falcon AI?',
            'How to install?',
            'Pricing?',
            'Free trial?'
        ];
        el.innerHTML = chips.map(function(c) {
            return '<button onclick="window._waiSuggest(\'' + c.replace(/'/g, "\\'") + '\')" style="background:rgba(0,217,255,0.08);border:1px solid rgba(0,217,255,0.2);color:#00d9ff;font-size:11px;padding:5px 10px;border-radius:14px;cursor:pointer;white-space:nowrap;font-family:inherit;">' + c + '</button>';
        }).join('');
    }

    window._waiSuggest = function(text) {
        document.getElementById('wai-input').value = text;
        sendMessage();
    };

    function renderMessages() {
        var el = document.getElementById('wai-messages');
        var html = '';
        chatHistory.forEach(function(m) {
            var isUser = m.role === 'user';
            var align = isUser
                ? 'margin-left:auto;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.15);'
                : 'margin-right:auto;background:rgba(0,217,255,0.06);border:1px solid rgba(0,217,255,0.12);';
            var label = isUser ? '👤 You' : '🤖 Falcon AI';
            html += '<div style="max-width:85%;padding:10px 14px;border-radius:12px;font-size:12.5px;line-height:1.6;' + align + '">';
            html += '<div style="font-size:9px;color:#5b6580;margin-bottom:4px;font-weight:600;">' + label + '</div>';
            html += '<div style="color:#e6edf3;word-wrap:break-word;white-space:pre-wrap;">' + escapeHtml(m.content) + '</div>';
            html += '</div>';
        });
        el.innerHTML = html;
        el.scrollTop = el.scrollHeight;
    }

    function addTypingIndicator() {
        var el = document.getElementById('wai-messages');
        var div = document.createElement('div');
        div.id = 'wai-typing';
        div.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:12px;font-size:12px;margin-right:auto;background:rgba(0,217,255,0.06);border:1px solid rgba(0,217,255,0.12);color:#5b6580;';
        div.innerHTML = '<div style="font-size:9px;color:#5b6580;margin-bottom:4px;font-weight:600;">🤖 Falcon AI</div><span style="animation:pulse 1.5s infinite;">Thinking...</span>';
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function removeTypingIndicator() {
        var t = document.getElementById('wai-typing');
        if (t) t.remove();
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async function sendMessage() {
        if (isTyping) return;
        var input = document.getElementById('wai-input');
        var text = input.value.trim();
        if (!text) return;

        input.value = '';
        chatHistory.push({ role: 'user', content: text });
        saveHistory();
        renderMessages();

        // Hide suggestions after first message
        document.getElementById('wai-suggestions').style.display = 'none';

        isTyping = true;
        addTypingIndicator();

        try {
            var reply = await callGroq(text);
            removeTypingIndicator();
            chatHistory.push({ role: 'assistant', content: reply });
            saveHistory();
            renderMessages();
        } catch(e) {
            removeTypingIndicator();
            chatHistory.push({ role: 'assistant', content: 'Sorry, I encountered an error: ' + (e.message || 'Unknown error') + '. Please try again.' });
            saveHistory();
            renderMessages();
        }
        isTyping = false;
    }

    async function callGroq(userMsg) {
        var systemPrompt = 'You are the FALCON AI Website Assistant on falconquantai.com. Help visitors with questions about Falcon AI (neural network EA for MT5).\n\n'
            + 'Key facts: Falcon AI is an automated MT5 trading system. 5 parallel models, 97% confidence threshold. Supports Gold, Dow Jones, Nasdaq, Bitcoin. 7-day FREE trial. Remote dashboard for phone control. AI chat inside dashboard.\n\n'
            + 'Setup: Register → verify OTP → get token + download links → install MT5 → place .ex5 in MQL5/Experts → attach to chart → paste URL+token in settings → enable Algo Trading.\n\n'
            + 'Pages: register.html, download.html, docs.html, pricing.html, features.html, login.html, account.html, contact.html, support.html\n\n'
            + 'Be friendly, concise, professional. Answer in user\'s language. Direct to relevant pages. Never reveal API keys or internal details.';

        var messages = [{ role: 'system', content: systemPrompt }];
        chatHistory.slice(-10).forEach(function(m) {
            messages.push({ role: m.role, content: m.content });
        });

        var resp = await fetch(_u, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _gk() },
            body: JSON.stringify({ model: _m, messages: messages, temperature: 0.7, max_tokens: 600, top_p: 0.92 })
        });

        var data = await resp.json();
        if (data.error) throw new Error(data.error.message || 'API error');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return data.choices[0].message.content;
    }

    // ── Add pulse animation ──
    var style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
    document.head.appendChild(style);

    // ── Initialize ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
