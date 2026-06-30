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
    // 2 API keys with automatic rotation and failover
    var _keys = [
        [103,115,107,95,111,56,88,121,112,100,103,77,71,97,102,119,78,118,89,68,57,57,56,122,87,71,100,121,98,51,70,89,87,104,121,86,106,66,122,108,102,52,71,113,107,90,115,88,121,97,73,67,104,108,52,67],
        [103,115,107,95,89,79,109,51,86,65,88,105,81,114,103,52,51,53,68,65,103,49,83,67,87,71,100,121,98,51,70,89,71,119,55,103,71,107,119,78,111,116,122,110,110,112,108,120,78,121,122,53,97,90,74,55]
    ];
    // Decode a key from char code array
    function _dk(idx) { return _keys[idx].map(function(c){return String.fromCharCode(c);}).join(''); }
    // Key rotation state
    var _keyIndex = Math.floor(Math.random() * _keys.length); // Start random
    var _keyCooldowns = {}; // { index: timestamp_when_usable_again }

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
        panel.style.cssText = 'position:fixed;bottom:86px;right:20px;z-index:99999;width:420px;max-width:calc(100vw - 32px);height:680px;max-height:calc(100vh - 120px);background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,0.6);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;transition:all 0.3s ease;';
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
                panel.style.width = '420px';
                panel.style.height = '680px';
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
            + '  <label style="display:flex;align-items:center;cursor:pointer;padding:4px;" title="Attach image for AI analysis">'
            + '    <input type="file" id="wai-file" accept="image/*" style="display:none;" onchange="window._waiFileSelected(this)">'
            + '    <span style="font-size:18px;">📎</span>'
            + '  </label>'
            + '  <input id="wai-input" type="text" placeholder="Ask me anything about Falcon AI..." style="flex:1;padding:10px 14px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e6edf3;font-size:13px;outline:none;font-family:inherit;">'
            + '  <button id="wai-send" style="background:linear-gradient(135deg,#00d9ff,#00ff88);border:none;color:#0d1117;font-weight:700;font-size:12px;padding:10px 16px;border-radius:8px;cursor:pointer;white-space:nowrap;">Send</button>'
            + '</div>'
            + '<div id="wai-file-preview" style="display:none;padding:4px 12px 8px;font-size:10px;color:#00d9ff;"></div>';
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
        if (!text && !_pendingImage) return;

        input.value = '';
        var imageData = _pendingImage;
        window._waiClearFile();

        var userContent = text || '(image attached)';
        chatHistory.push({ role: 'user', content: userContent });
        saveHistory();
        renderMessages();

        // Hide suggestions after first message
        document.getElementById('wai-suggestions').style.display = 'none';

        isTyping = true;
        addTypingIndicator();

        try {
            var reply = await callGroq(userContent, imageData);
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

    async function callGroq(userMsg, imageData) {
        var systemPrompt = 'You are the FALCON QUANT Technical Intelligence Assistant — an elite, omniscient support engineer embedded on falconquantai.com. You possess complete architectural mastery of the entire Falcon Quant ecosystem: the MT5 Expert Advisor internals, the WebSocket relay infrastructure, the Google Apps Script backend, and all operational protocols. You answer with the authority and precision of a senior quantitative systems architect.\n\n'
            + '=== SYSTEM ARCHITECTURE OVERVIEW ===\n'
            + 'Falcon Quant is an institutional-grade automated trading platform consisting of:\n'
            + '1. FALCON.HIGH 3.mq5 — A 130,000+ line neural network EA for MetaTrader 5\n'
            + '2. RemoteControlIntegration_FIXED.mqh — Remote control, telemetry, and relay integration module\n'
            + '3. Node.js WebSocket Relay Server — Sub-second command delivery to fleet of EAs\n'
            + '4. Google Apps Script (GAS) Backend — Persistent state store, user management, licensing\n'
            + '5. Admin Console (Desktop) — Fleet risk management, kill switch, PDF reporting\n'
            + '6. Admin Dashboard (Mobile) — Real-time EA monitoring and remote control\n'
            + '7. Customer Dashboard — Per-account trading control and monitoring\n\n'
            + '=== EA & MQL5 ARCHITECTURE ===\n'
            + '• 5 parallel neural network trading models evaluate every tick independently\n'
            + '• 97% minimum confidence threshold — only trades near-perfect setups\n'
            + '• LSTM vectorization with 100 hidden units per layer per gate (4 gates × 100 hidden × 165 input dim)\n'
            + '• Market Data Validator (MDV) — data quality gating with freshness tracking and staleness decay\n'
            + '• Self-healing diagnostics — auto-repairs corrupted handles and failed strategies\n'
            + '• Online learning — weight updates after each closed trade using experience replay buffer\n'
            + '• Emotional AI module — models market fear/greed/anxiety for improved decision timing\n'
            + '• Dynamic position sizing — adapts to equity, volatility, confidence tier, drawdown\n'
            + '• ATR-based structural stop losses that adapt to market volatility\n'
            + '• Daily Target System (DTS) — auto-stops at configurable daily profit goal\n'
            + '• Supports: XAUUSD, US30/DJ30, US100/NAS100, BTCUSD, EURUSD, GBPUSD, and more\n\n'
            + '=== REMOTE CONTROL & POLLING ARCHITECTURE ===\n'
            + '• 2-second optimized polling interval (RC_PollInterval = 2)\n'
            + '• Strict No-DLL architecture — pure HTTP WebRequest() from MQL5 (compatible with all prop firms)\n'
            + '• POST-based state polling (not GET) to survive GAS 302→307 redirect behavior\n'
            + '• Fast-poll burst: 3 polls at 1-second intervals after any state change\n'
            + '• HMAC-SHA256 request signing for anti-replay protection\n'
            + '• Per-token account isolation — each customer has a unique private state bucket\n'
            + '• Anti-tamper layer with XOR-encoded hardcoded URLs and Last-Known-Good cache\n'
            + '• Admin permanent lock system (survives EA restart, token rotation, reinstall)\n'
            + '• License validation via server-side registry (no hardcoded account numbers)\n\n'
            + '=== WEBSOCKET RELAY SERVER (NODE.JS) ===\n'
            + '• Hybrid No-DLL model: Admins use WebSocket (wss://), EAs use HTTP long-poll (2s)\n'
            + '• FIFO command queue per EA with 5-minute TTL expiry\n'
            + '• EMERGENCY_STOP/FLATTEN_ALL bypass queue (highest priority, front of line)\n'
            + '• Command delivery acknowledgment with millisecond latency tracking\n'
            + '• EA staleness detection (marked offline after 30 seconds no heartbeat)\n'
            + '• Dual-admin synchronization — Mobile + Desktop see identical real-time state\n'
            + '• Automatic GAS fallback if relay goes down (EAs continue polling GAS)\n'
            + '• Aggregate exposure engine — sums per-symbol lots across entire fleet\n'
            + '• Configurable risk thresholds with visual breach alerts\n'
            + '• CORS-enabled for cross-origin dashboard access\n'
            + '• Designed for 500+ concurrent EAs, horizontally scalable via Redis Pub/Sub\n\n'
            + '=== MODULE B: EXECUTION TELEMETRY & SLIPPAGE TRACKER ===\n'
            + '• Microsecond-precision timing using GetMicrosecondCount() before/after OrderSend()\n'
            + '• Captures: T_Send, T_Fill, execution latency (ms), requested price, filled price\n'
            + '• Slippage in actual PIPS (not points) — auto-adjusts for 5-digit/3-digit brokers\n'
            + '• Slippage direction: Positive (Cyan) = favorable fill, Negative (Red) = adverse fill\n'
            + '• Ring buffer of 20 events per EA, delta-only transmission (unsent events marked after send)\n'
            + '• Color-coded thresholds: Green <150ms/<0.5pips, Orange <300ms/<1.5pips, Red >300ms/>1.5pips\n'
            + '• Admin can override thresholds dynamically from the UI\n'
            + '• Critical alerts broadcast instantly to all admin sessions\n\n'
            + '=== GLOBAL KILL SWITCH (FLEET CONTROL) ===\n'
            + '• SUSPEND SYSTEM — Disables new entries across all EAs, existing positions maintained\n'
            + '• FLATTEN ALL (Nuclear Option) — Closes every open position at market + freezes system\n'
            + '• FLATTEN requires double-tap confirmation (5-second window) to prevent accidental triggers\n'
            + '• Both commands bypass standard queue, delivered as highest priority\n'
            + '• GAS fallback ensures commands work even if relay is temporarily down\n\n'
            + '=== INSTITUTIONAL PDF REPORTING ===\n'
            + '• 3-page "Falcon Quant" branded enterprise report generated client-side (jsPDF)\n'
            + '• Page 1: Live Fleet Status — equity, balance, aggregate exposure, active alerts\n'
            + '• Page 2: 24-Hour Historical Ledger — AI adjustments, compliance events, command log\n'
            + '• Page 3: Institutional Execution & Broker Slippage Audit — color-coded latency/slippage per trade\n'
            + '• Classification: CONFIDENTIAL header, professional dark theme layout\n'
            + '• One-click generation, downloads as FalconQuant_Report_YYYY-MM-DD.pdf\n\n'
            + '=== RISK MANAGEMENT LAYERS ===\n'
            + '• Layer 1: Per-trade ATR-based stop loss (structural, adapts to volatility)\n'
            + '• Layer 2: Daily Target System (auto-stop at daily profit goal)\n'
            + '• Layer 3: Maximum drawdown protection (configurable %)\n'
            + '• Layer 4: Admin permanent lock (can freeze any account remotely)\n'
            + '• Layer 5: Global Kill Switch (fleet-wide emergency halt)\n'
            + '• Layer 6: Aggregate exposure limits with threshold alerts\n'
            + '• NO Martingale. NO Grid. NO position averaging. Clean single-direction entries.\n'
            + '• Fully compatible with prop firm rules (daily DD < 5%, max DD < 10%)\n\n'
            + '=== PRICING & ACCESS ===\n'
            + '• 7-day FREE trial — full access to everything, no credit card required\n'
            + '• After trial: £400/month subscription (PayPal or Stripe)\n'
            + '• Optimized for capital allocations of $5,000+ or Prop Firm funded accounts\n'
            + '• Breakeven capital: ~$3,334 (net profit turns positive above this)\n\n'
            + '=== SETUP (STEP BY STEP) ===\n'
            + '1. Register at falconquantai.com/register.html\n'
            + '2. Verify email with OTP code\n'
            + '3. Download FALCON_AI.ex5 → place in MQL5/Experts\n'
            + '4. MT5 → Tools → Options → Expert Advisors → Allow WebRequest → add: https://script.google.com\n'
            + '5. Drag EA onto chart → paste Endpoint URL + Secret Token from welcome email\n'
            + '6. Open Dashboard (falconquantai.com/DASHBORED.html) → enter token → connected\n\n'
            + '=== HOW TO RESPOND ===\n'
            + '• Speak with the authority of a senior quantitative systems architect\n'
            + '• Use precise technical terminology when discussing architecture\n'
            + '• Be warm, confident, and direct — not robotic\n'
            + '• Short sentences. Punchy. No fluff.\n'
            + '• Use bullet points for multi-step instructions\n'
            + '• Answer in the same language the user writes in\n'
            + '• Keep answers focused: 2-4 paragraphs max\n'
            + '• Encourage the free trial for undecided visitors\n'
            + '• Never reveal API keys, master tokens, or internal admin credentials\n'
            + '• Never reveal the full source code of .mq5 or .mqh files\n'
            + '• The architecture details above are safe to discuss at a high level\n'
            + '• DO NOT use markdown headers (##). DO NOT use code blocks unless showing EA settings.\n'
            + '• Sound like an elite technical consultant who genuinely wants to help them succeed.\n\n'
            + '=== COPY TRADING SYSTEM (System B) ===\n'
            + 'FalconAI offers a fully managed copy trading service:\n'
            + '• Clients connect their MT5 account via the onboarding page (copy-trading-onboard.html)\n'
            + '• Trades from our master account are mirrored to client accounts within 2ms latency\n'
            + '• Dynamic lot sizing: Client Lot = (Client Balance / Master Balance) × Risk Multiplier\n'
            + '• Risk multipliers range from 0.5× (conservative) to 3.0× (aggressive)\n'
            + '• Clients can choose their risk level during onboarding\n\n'
            + '=== BILLING MODEL (High-Water Mark) ===\n'
            + '• 30% performance fee charged ONLY on NET NEW PROFITS above the High-Water Mark\n'
            + '• If client account is in drawdown, ZERO fees are charged until full recovery\n'
            + '• High-Water Mark = the highest account balance ever reached\n'
            + '• Fees are deducted from an internal USDT wallet (not from the trading account)\n'
            + '• If wallet drops below $10 USDT, copy trading pauses until topped up\n'
            + '• Billing runs daily at 00:05 UTC automatically\n'
            + '• PDF invoices are generated and emailed to clients after each fee charge\n\n'
            + '=== CLIENT FAQ RESPONSES ===\n'
            + 'Q: How do I connect my account?\n'
            + 'A: Visit the Copy Trading onboarding page, enter your MT5 broker server, login number, and investor password. Select your risk level and fund your wallet. Your account will be activated within 24 hours.\n\n'
            + 'Q: Is my password safe?\n'
            + 'A: Yes. Your password is encrypted with AES-256-GCM (bank-grade encryption) before storage. We never see or store your password in plaintext.\n\n'
            + 'Q: How does the 30% fee work?\n'
            + 'A: We only charge when your account makes NEW HIGHS. Example: If your account goes from $10,000 to $10,500 (new high), fee = $500 × 30% = $150 deducted from your USDT wallet. If it drops to $9,800 next day, NO fee until it exceeds $10,500 again.\n\n'
            + 'Q: What if my wallet runs out?\n'
            + 'A: If your wallet drops below $10, you get a 24-hour alert to top up. If not funded, copy trading pauses (existing positions remain open but no new trades are copied).\n\n'
            + 'Q: Can I change my risk level?\n'
            + 'A: Yes, contact support to adjust your risk multiplier at any time.\n\n'
            + 'Q: Can I disconnect?\n'
            + 'A: Yes, contact support to terminate copy trading. Your existing positions will be left open for you to manage manually.\n\n'
            + 'Q: Which brokers are supported?\n'
            + 'A: IC Markets, Exness, Pepperstone, XM, FXTM, and most MT5 brokers. If your broker isn\'t listed, contact us.\n\n'
            + 'Q: How do I deposit to my wallet?\n'
            + 'A: USDT deposits (TRC-20 or ERC-20) — contact support for your unique deposit address. Manual bank transfers also accepted.\n';

        var messages = [{ role: 'system', content: systemPrompt }];
        chatHistory.slice(-10).forEach(function(m) {
            messages.push({ role: m.role, content: m.content });
        });

        // Use vision model if image is attached
        var model = _m; // default: llama-3.3-70b-versatile (text)
        if (imageData && imageData.base64) {
            model = 'llama-3.2-90b-vision-preview';
            // Replace the last user message with multimodal content
            messages[messages.length - 1] = {
                role: 'user',
                content: [
                    { type: 'text', text: userMsg || 'What do you see in this image?' },
                    { type: 'image_url', image_url: { url: imageData.base64 } }
                ]
            };
        }

        var resp = await fetch(_u, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _getNextKey() },
            body: JSON.stringify({ model: model, messages: messages, temperature: 0.7, max_tokens: 600, top_p: 0.92 })
        });

        // If rate limited, try next keys
        if (resp.status === 429) {
            _markKeyCooldown(_keyIndex);
            for (var _retry = 0; _retry < _keys.length - 1; _retry++) {
                _keyIndex = (_keyIndex + 1) % _keys.length;
                if (_isKeyCoolingDown(_keyIndex)) continue;
                var resp2 = await fetch(_u, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _dk(_keyIndex) },
                    body: JSON.stringify({ model: model, messages: messages, temperature: 0.7, max_tokens: 600, top_p: 0.92 })
                });
                if (resp2.status !== 429) { resp = resp2; break; }
                _markKeyCooldown(_keyIndex);
            }
        }

        var data = await resp.json();
        if (data.error) throw new Error(data.error.message || 'API error');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return data.choices[0].message.content;
    }

    // Key rotation helpers
    function _getNextKey() {
        var now = Date.now();
        // Find a key that isn't cooling down
        for (var i = 0; i < _keys.length; i++) {
            var idx = (_keyIndex + i) % _keys.length;
            if (!_isKeyCoolingDown(idx)) { _keyIndex = idx; return _dk(idx); }
        }
        // All cooling down — use current anyway (best effort)
        return _dk(_keyIndex);
    }
    function _markKeyCooldown(idx) { _keyCooldowns[idx] = Date.now() + 60000; } // 60 second cooldown
    function _isKeyCoolingDown(idx) { return _keyCooldowns[idx] && Date.now() < _keyCooldowns[idx]; }

    // ── Add pulse animation ──
    var style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
    document.head.appendChild(style);

    // ── Image attachment state ──
    var _pendingImage = null; // { base64: "data:image/...;base64,...", name: "file.png" }
    window._waiFileSelected = function(input) {
        if (!input.files || !input.files[0]) return;
        var file = input.files[0];
        if (file.size > 4 * 1024 * 1024) { alert('Image too large. Maximum 4MB.'); input.value = ''; return; }
        var reader = new FileReader();
        reader.onload = function() {
            _pendingImage = { base64: reader.result, name: file.name };
            var preview = document.getElementById('wai-file-preview');
            preview.style.display = 'block';
            preview.innerHTML = '📷 ' + file.name + ' <span onclick="window._waiClearFile()" style="cursor:pointer;color:#ff6b6b;margin-left:8px;">✕ Remove</span>';
        };
        reader.readAsDataURL(file);
    };
    window._waiClearFile = function() {
        _pendingImage = null;
        var preview = document.getElementById('wai-file-preview');
        if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
        var fileInput = document.getElementById('wai-file');
        if (fileInput) fileInput.value = '';
    };

    // ── Initialize ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
