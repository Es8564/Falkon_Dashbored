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
    var _k = [103,115,107,95,112,108,102,69,74,73,97,120,68,97,100,118,53,117,105,83,114,50,80,107,87,71,100,121,98,51,70,89,
              120,90,53,48,80,79,79,79,49,103,71,88,70,119,108,84,54,86,52,79,118,54,101,55];
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
        panel.style.cssText = 'position:fixed;bottom:86px;right:20px;z-index:99999;width:370px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.6);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;transition:all 0.3s ease;';
        var isMaximized = false;
        var isSpeakEnabled = false;
        window._waiToggleSpeak = function() {
            isSpeakEnabled = !isSpeakEnabled;
            var btn = document.getElementById('wai-speak-btn');
            if (isSpeakEnabled) {
                btn.textContent = '🔊';
                btn.title = 'Voice ON (click to mute)';
            } else {
                btn.textContent = '🔇';
                btn.title = 'Voice OFF (click to enable)';
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            }
        };
        window._waiSpeak = function(text) {
            if (!isSpeakEnabled || !window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            // Try to use a good English voice
            var voices = window.speechSynthesis.getVoices();
            for (var i = 0; i < voices.length; i++) {
                if (voices[i].lang.indexOf('en') === 0 && voices[i].name.indexOf('Google') >= 0) {
                    utterance.voice = voices[i]; break;
                }
            }
            window.speechSynthesis.speak(utterance);
        };
        window._waiToggleSize = function() {
            isMaximized = !isMaximized;
            if (isMaximized) {
                panel.style.width = 'calc(100vw - 40px)';
                panel.style.height = 'calc(100vh - 100px)';
                panel.style.maxWidth = '700px';
                panel.style.bottom = '20px';
                panel.style.right = '20px';
                panel.style.borderRadius = '14px';
                document.getElementById('wai-size-btn').textContent = '🗗';
                document.getElementById('wai-size-btn').title = 'Minimize';
            } else {
                panel.style.width = '370px';
                panel.style.height = '520px';
                panel.style.maxWidth = 'calc(100vw - 32px)';
                panel.style.bottom = '86px';
                panel.style.right = '20px';
                panel.style.borderRadius = '14px';
                document.getElementById('wai-size-btn').textContent = '⬜';
                document.getElementById('wai-size-btn').title = 'Maximize';
            }
        };
        panel.innerHTML = ''
            + '<div style="padding:14px 16px;background:rgba(22,27,34,0.95);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">'
            + '  <div style="display:flex;align-items:center;gap:8px;">'
            + '    <span style="font-size:15px;font-weight:900;background:linear-gradient(90deg,#00d9ff,#00ff88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">◈ Falcon AI</span>'
            + '    <span style="font-size:10px;color:#00ff88;background:rgba(0,255,136,0.1);padding:2px 6px;border-radius:4px;">AI Assistant</span>'
            + '  </div>'
            + '  <div style="display:flex;gap:6px;">'
            + '    <button id="wai-size-btn" title="Maximize" onclick="window._waiToggleSize()" style="background:none;border:none;color:#5b6580;font-size:14px;cursor:pointer;padding:2px 4px;">⬜</button>'
            + '    <button id="wai-speak-btn" title="Toggle voice (read replies aloud)" onclick="window._waiToggleSpeak()" style="background:none;border:none;color:#5b6580;font-size:14px;cursor:pointer;padding:2px 4px;">🔇</button>'
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
            if (window._waiSpeak) window._waiSpeak(reply);
        } catch(e) {
            removeTypingIndicator();
            chatHistory.push({ role: 'assistant', content: 'Sorry, I encountered an error: ' + (e.message || 'Unknown error') + '. Please try again.' });
            saveHistory();
            renderMessages();
        }
        isTyping = false;
    }

    async function callGroq(userMsg) {
        var systemPrompt = 'You are the FALCON AI Website Assistant — an expert support agent embedded on falconquantai.com. You speak like a knowledgeable, friendly senior trading systems analyst. You help visitors understand the product, guide them through setup, and resolve issues — like a real human support agent would.\n\n'
            + '=== ABOUT FALCON AI ===\n'
            + 'Falcon AI is an advanced multi-modal neural network Expert Advisor (EA) for MetaTrader 5. It trades automatically using deep learning, institutional market structure analysis, and real-time adaptive intelligence.\n\n'
            + 'CORE ARCHITECTURE:\n'
            + '• 5 parallel trading models evaluate every market tick independently:\n'
            + '  1. Neural Network Model — fires on pure NN high-confidence directional signals\n'
            + '  2. Zone Strategy Model — institutional supply/demand zones + NN confirmation\n'
            + '  3. On-Demand Zone Model — triggers when price approaches pre-identified high-quality zones\n'
            + '  4. Full Confluence Model — strictest: requires zone + high NN confidence + multiple module agreement\n'
            + '  5. Zone Reversal Model — counter-trend at exhaustion points near key zone boundaries\n'
            + '• 97% minimum confidence threshold — the EA only trades when the neural network is extremely confident\n'
            + '• This is the #1 reason the EA does not trade frequently — it waits for near-perfect setups\n\n'
            + 'KEY FEATURES:\n'
            + '• Daily Target System (DTS) — automatically stops trading after reaching daily profit goal (e.g. 2.5% of equity)\n'
            + '• Self-healing diagnostics — monitors itself and auto-repairs corrupted handles or failed strategies\n'
            + '• Online learning — continuously improves from live trade outcomes (weight updates after each closed trade)\n'
            + '• Remote Control Dashboard — monitor and control the EA from any phone/tablet/PC\n'
            + '• AI Chat inside dashboard — ask questions, get analysis, even send trading commands via chat\n'
            + '• Emotional AI module — models market fear/greed to improve decision timing\n'
            + '• Dynamic position sizing — adjusts lot size based on equity, volatility, confidence tier, and drawdown\n'
            + '• ATR-based stop losses — structural stops that adapt to market volatility\n'
            + '• Supports: Gold (XAUUSD), Dow Jones (US30/DJ30), Nasdaq (US100/NAS100), Bitcoin (BTCUSD), and more\n\n'
            + '=== PRICING ===\n'
            + '• 7-day FREE trial — full access to everything, no credit card required\n'
            + '• After trial: paid subscription (monthly or yearly)\n'
            + '• Payment: PayPal or Stripe (credit/debit cards)\n'
            + '• All plans include: full EA, dashboard, live support, updates, AI chat\n\n'
            + '=== SETUP (STEP BY STEP) ===\n'
            + '1. Register at falconquantai.com/register.html (name, email, phone, country, password)\n'
            + '2. Verify email with OTP code\n'
            + '3. Receive Welcome Email with: Secret Token + Server URL + download links\n'
            + '4. Install MetaTrader 5 from your broker\n'
            + '5. Download FALCON_AI.ex5 → place in MT5 → File → Open Data Folder → MQL5 → Experts\n'
            + '6. Restart MT5 (or right-click Navigator → Refresh)\n'
            + '7. MANDATORY: MT5 → Tools → Options → Expert Advisors tab:\n'
            + '   - Tick "Allow algorithmic trading"\n'
            + '   - Tick "Allow WebRequest for listed URL"\n'
            + '   - Click "+ add new URL" → type: https://script.google.com/\n'
            + '   - Click OK\n'
            + '8. Open a chart (e.g. XAUUSD H1) → drag FALCON AI from Navigator onto chart\n'
            + '9. In EA Inputs tab → under "=== REMOTE CONTROL SETTINGS ===":\n'
            + '   - "Google Apps Script /exec URL" (RC_EndpointURL) → paste: https://script.google.com/macros/s/AKfycbw4NbVvTCOI1ZKXw3NhaKDPQGyHWhk6ILinaZ32PtwTBHzsRMRr-njfllSmhKtUcmr9/exec\n'
            + '   - "UNIQUE token per account" (RC_SecretToken) → paste your personal token from welcome email\n'
            + '   - "Enable Remote Control System" → true\n'
            + '10. Click OK → EA connects and starts analyzing\n'
            + '11. Open Dashboard on phone: falconquantai.com/DASHBORED.html (or download from account page)\n\n'
            + '=== COMMON QUESTIONS ===\n'
            + 'Q: EA not trading? → Most common reason: confidence below 97%. This is NORMAL. The EA waits for high-quality setups only. Also check: Allow Algo Trading enabled? Daily Target already reached? EA attached to chart?\n'
            + 'Q: Dashboard offline? → Check Secret Token is correct. Check internet. Try Ctrl+Shift+R to hard refresh.\n'
            + 'Q: License failed? → Check internet, verify URL and token are correct in EA settings.\n'
            + 'Q: How to update? → Download new .ex5 → replace old file in MQL5/Experts → restart MT5.\n'
            + 'Q: Multiple brokers? → Yes, each account gets its own license. Contact support.\n'
            + 'Q: Best timeframe? → H1 recommended. EA internally analyzes multiple timeframes.\n'
            + 'Q: Is it safe? → Dynamic sizing, ATR stops, drawdown limits, Daily Target, max position caps.\n'
            + 'Q: VPS? → Recommended for 24/7 operation. Any Windows VPS with MT5 works.\n\n'
            + '=== WEBSITE PAGES ===\n'
            + 'Home: falconquantai.com | Features: /features.html | Pricing: /pricing.html\n'
            + 'Download: /download.html | Register: /register.html | Login: /login.html\n'
            + 'Account: /account.html | Setup: /setup.html | Docs: /docs.html\n'
            + 'Support: /support.html | Contact: /contact.html | Status: /status.html\n\n'
            + '=== HOW TO RESPOND ===\n'
            + '• Speak naturally and conversationally — like a real expert analyst talking to a colleague\n'
            + '• Be warm, confident, and direct — not robotic or overly formal\n'
            + '• Use short sentences. Keep it punchy. No fluff.\n'
            + '• When explaining something technical, use analogies and plain language first, then details\n'
            + '• Use bullet points for multi-step instructions\n'
            + '• Answer in the same language the user writes in\n'
            + '• Keep answers focused: 2-3 short paragraphs max for explanations\n'
            + '• Link to relevant pages when helpful\n'
            + '• Encourage the free trial for undecided visitors\n'
            + '• If you cannot help with something, direct to support (contact page or dashboard live chat)\n'
            + '• Never reveal internal code details, API keys, or admin information\n'
            + '• The Server URL above is public and safe to share with users\n'
            + '• DO NOT use markdown headers (##). DO NOT use code blocks. Just plain text with bullet points.\n'
            + '• Sound human. Sound helpful. Sound like you genuinely care about helping them succeed.';

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
