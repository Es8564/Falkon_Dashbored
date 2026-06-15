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

    var GROQ_KEY = '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';
    var GROQ_MODEL = 'llama-3.3-70b-versatile';
    var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
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

    // ── SYSTEM PROMPT — comprehensive knowledge base ──
    var SYSTEM_PROMPT = `You are the FALCON AI Website Assistant — an expert support chatbot embedded on the Falcon Quant AI website (falconquantai.com). You help visitors and customers with any questions about the product, setup, licensing, features, troubleshooting, and workflows.

=== ABOUT FALCON AI ===
Falcon AI is an advanced neural network Expert Advisor (EA) for MetaTrader 5. It trades automatically using deep learning, institutional market structure analysis, and real-time adaptive intelligence. It supports Gold (XAUUSD), Dow Jones (US30/DJ30), Nasdaq (US100/NAS100), Bitcoin (BTCUSD), and other major instruments.

Key features:
• 5 parallel trading models (Neural Network, Zone Strategy, On-Demand Zone, Confluence Entry, Zone Reversal)
• 97% minimum confidence threshold — only trades on very high-conviction signals
• Daily Target System (DTS) — stops trading after reaching daily profit goal
• Self-healing diagnostics — auto-repairs issues without user intervention
• Online learning — continuously improves from live trade outcomes
• Remote control dashboard — manage the EA from any device (phone, tablet, PC)
• AI Chat inside the dashboard — ask questions, get analysis, send commands to the EA
• Emotional AI module — models market fear/greed to improve decision timing

=== PRICING & PLANS ===
• 7-day FREE trial — full access to everything, no credit card required
• After trial: paid subscription required (monthly or yearly)
• Payment methods: PayPal, Stripe (credit/debit cards)
• All plans include: full EA, dashboard, live support, updates, AI chat

=== GETTING STARTED (STEP BY STEP) ===
1. Register at falconquantai.com/register.html — enter name, email, phone, country, create password
2. Verify email with OTP code sent to your inbox
3. After registration, you receive a Welcome Email with:
   - Your Secret Token (connection key)
   - Download links for EA (.ex5 file) and Dashboard (.html file)
   - Server URL (for EA connection)
4. Install MetaTrader 5 on your PC/VPS (download from your broker or metaquotes.net)
5. Download the FALCON_AI.ex5 file and place it in: MT5 → File → Open Data Folder → MQL5 → Experts
6. Restart MT5 or right-click Navigator → Refresh
7. Open a chart (e.g., XAUUSD H1) and drag FALCON_AI from Navigator onto the chart
8. In the EA settings dialog:
   - Go to "Inputs" tab
   - Paste your Server URL into the endpoint field
   - Paste your Secret Token into the token field
   - Make sure "Allow Algo Trading" is enabled (button on MT5 toolbar)
9. Click OK — the EA will connect to the server and start analyzing
10. Open the Dashboard (DASHBORED.html) on your phone or any browser — it connects automatically using the same token

=== DASHBOARD ===
The Remote Control Dashboard is an HTML file you open in any browser. Features:
• Real-time monitoring of EA status, positions, and profit
• Daily Target progress bar and profit tracking
• Enable/disable EA trading remotely
• Pause/resume specific symbols
• AI Chat — ask questions about the EA's decisions, get analysis
• Live Support chat — message the admin team directly
• Emergency stop — halt all trading instantly from your phone
• Works offline as a PWA (installable on phone home screen)

=== LICENSING & ACTIVATION ===
• License is tied to your account (broker server + login number)
• The EA validates your license online on every startup
• Maximum 3 devices per account (for security)
• License issues? Contact support via the dashboard or website

=== COMMON ISSUES & TROUBLESHOOTING ===
Q: EA shows "License validation failed"
A: Check your internet connection. Make sure the endpoint URL and token are correct in EA settings. Contact support if it persists.

Q: EA is not trading
A: Check: (1) Is "Allow Algo Trading" enabled in MT5? (2) Is the EA attached to a chart? (3) Is the confidence threshold being met? (The EA only trades on 97%+ confidence signals — this is normal.) (4) Check the Daily Target — if reached, trading stops for the day.

Q: Dashboard shows "Offline" or won't connect
A: Make sure you're using the correct Secret Token. Check your internet connection. Try refreshing the page.

Q: How do I update the EA?
A: Download the new .ex5 file from your account or email. Replace the old file in MT5 → MQL5 → Experts. Restart MT5.

Q: Can I use multiple brokers?
A: Yes, each broker/account gets its own license entry. Contact support to register additional accounts.

Q: What timeframe should I use?
A: H1 (1 hour) is recommended. The EA analyzes multiple timeframes internally regardless of the chart timeframe.

Q: Is my money safe?
A: The EA uses strict risk management: dynamic position sizing based on equity, ATR-based stop losses, maximum drawdown limits, and the Daily Target System to lock in profits.

=== WEBSITE PAGES ===
• Home (index.html) — overview, key features, call to action
• Features (features.html) — detailed feature list
• Pricing (pricing.html) — subscription plans and pricing
• Compare (compare.html) — comparison with other EAs
• About (about.html) — company information
• Blog (blog.html) — articles and updates
• Docs (docs.html) — documentation and guides
• Download (download.html) — download EA and dashboard
• Login (login.html) — sign in to your account
• Register (register.html) — create a new account
• Account (account.html) — manage your account, subscription, devices
• Contact (contact.html) — contact form for support
• Support (support.html) — FAQ and help resources
• Affiliate (affiliate.html) — referral program

=== RESPONSE GUIDELINES ===
• Be friendly, professional, and concise
• Answer in the same language the user writes in
• Provide specific steps when guiding users through processes
• Link to relevant pages when appropriate (e.g., "Visit falconquantai.com/register.html to create your account")
• If you don't know something specific, direct users to contact support
• Never reveal API keys, admin credentials, or internal system details
• Encourage users to try the free trial
• Be honest about what the EA can and cannot do
• Keep responses to 2-4 paragraphs maximum unless detailed steps are needed`;

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
        var messages = [{ role: 'system', content: SYSTEM_PROMPT }];
        // Add last 10 messages for context
        chatHistory.slice(-10).forEach(function(m) {
            messages.push({ role: m.role, content: m.content });
        });
        // Current message already in history, but also explicitly add
        // (it's the last item in chatHistory already)

        var resp = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GROQ_KEY
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 800,
                top_p: 0.92
            })
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
