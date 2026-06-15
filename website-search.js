// ═══════════════════════════════════════════════════════════
// FALCON AI — Website Search Engine
// Client-side full-text search with keyword matching,
// partial matches, intelligent suggestions, and AI integration.
// Loaded via nav-auth.js on all website pages.
// ═══════════════════════════════════════════════════════════

(function() {
    'use strict';

    // Don't load on dashboards or admin pages
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('dashbored') >= 0 || path.indexOf('admin') >= 0) return;

    // ── SEARCH INDEX — all website content indexed ──
    var INDEX = [
        // ─── HOME ───
        { url: 'index.html', title: 'Home — Falcon AI', category: 'Overview', keywords: 'home main landing page falcon ai trading system mt5 metatrader neural network automated', description: 'Advanced neural network Expert Advisor for MetaTrader 5. Automated algorithmic trading powered by deep learning.' },

        // ─── FEATURES ───
        { url: 'features.html', title: 'Features', category: 'Product', keywords: 'features capabilities neural network 5 models confidence threshold daily target self healing online learning remote control dashboard emotional ai zone strategy order block fair value gap liquidity supply demand', description: 'Complete feature list: 5 parallel trading models, 97% confidence gate, Daily Target System, self-healing AI, remote dashboard, and more.' },

        // ─── PRICING ───
        { url: 'pricing.html', title: 'Pricing & Plans', category: 'Subscription', keywords: 'pricing plans cost subscription monthly yearly annual payment paypal stripe free trial 7 day price buy purchase', description: 'Subscription plans and pricing. 7-day free trial included. Pay with PayPal or credit card via Stripe.' },

        // ─── COMPARE ───
        { url: 'compare.html', title: 'Compare', category: 'Product', keywords: 'compare comparison other ea expert advisors difference advantage better why choose falcon vs alternatives', description: 'See how Falcon AI compares to other trading systems and Expert Advisors.' },

        // ─── DOWNLOAD ───
        { url: 'download.html', title: 'Download', category: 'Setup', keywords: 'download ea expert advisor ex5 file dashboard dashbored install get started mt5 metatrader', description: 'Download the Falcon AI EA (.ex5) and Remote Control Dashboard. Step-by-step installation guide.' },

        // ─── DOCUMENTATION ───
        { url: 'docs.html', title: 'Documentation', category: 'Guides', keywords: 'documentation docs guide manual instructions how to setup configuration settings inputs parameters timeframe symbol broker vps server', description: 'Complete documentation, user guides, and configuration reference for Falcon AI.' },

        // ─── REGISTER ───
        { url: 'register.html', title: 'Create Account', category: 'Account', keywords: 'register sign up create account new user otp email verification trial free', description: 'Create a free account and start your 7-day trial. Full access to all features.' },

        // ─── LOGIN ───
        { url: 'login.html', title: 'Login', category: 'Account', keywords: 'login sign in account access forgot password reset', description: 'Sign in to your Falcon AI account to access downloads, dashboard, and support.' },

        // ─── ACCOUNT ───
        { url: 'account.html', title: 'My Account', category: 'Account', keywords: 'account profile subscription manage devices token secret connection settings change password delete account', description: 'Manage your account, view subscription status, connection credentials, and devices.' },

        // ─── CONTACT ───
        { url: 'contact.html', title: 'Contact Us', category: 'Support', keywords: 'contact us support help email message form question problem issue report bug feedback', description: 'Get in touch with the Falcon AI support team. Send a message and we\'ll respond quickly.' },

        // ─── SUPPORT ───
        { url: 'support.html', title: 'Support & FAQ', category: 'Support', keywords: 'support faq frequently asked questions help troubleshooting problems issues common fix solve', description: 'Find answers to common questions, troubleshooting guides, and support resources.' },

        // ─── ABOUT ───
        { url: 'about.html', title: 'About Us', category: 'Company', keywords: 'about us company team who we are mission vision story background', description: 'Learn about Falcon Quant AI — our mission, team, and vision for AI-powered trading.' },

        // ─── BLOG ───
        { url: 'blog.html', title: 'Blog', category: 'News', keywords: 'blog news updates articles posts announcements changelog release notes new features', description: 'Latest news, updates, feature announcements, and educational articles.' },

        // ─── CHANGELOG ───
        { url: 'changelog.html', title: 'Changelog', category: 'News', keywords: 'changelog updates version history release notes what is new changes improvements fixes', description: 'Complete version history and changelog. See what\'s new in each release.' },

        // ─── AFFILIATE ───
        { url: 'affiliate.html', title: 'Affiliate Program', category: 'Partner', keywords: 'affiliate referral program earn money commission partner share invite friend code reward', description: 'Join our affiliate program and earn commissions for referrals.' },

        // ─── PRIVACY ───
        { url: 'privacy.html', title: 'Privacy Policy', category: 'Legal', keywords: 'privacy policy data protection personal information gdpr cookies', description: 'How we collect, use, and protect your personal data.' },

        // ─── TERMS ───
        { url: 'terms.html', title: 'Terms of Service', category: 'Legal', keywords: 'terms of service conditions agreement legal rules usage policy', description: 'Terms and conditions for using Falcon AI services.' },

        // ─── REFUND ───
        { url: 'refund.html', title: 'Refund Policy', category: 'Legal', keywords: 'refund policy money back guarantee cancel cancellation return', description: 'Our refund and cancellation policy for subscriptions.' },

        // ─── SECURITY ───
        { url: 'security.html', title: 'Security', category: 'Trust', keywords: 'security safe secure encryption protection data safety trust hmac ssl https', description: 'How Falcon AI protects your data, account, and trading operations.' },

        // ─── STATUS ───
        { url: 'status.html', title: 'System Status', category: 'Support', keywords: 'status uptime server online offline check connection health system', description: 'Check the current status of Falcon AI servers and services.' },

        // ─── SETUP ───
        { url: 'setup.html', title: 'Setup Guide', category: 'Setup', keywords: 'setup guide connect endpoint url token configuration first time install attach chart drag drop ea settings allow algo trading', description: 'Step-by-step setup guide: connect the EA to your account, configure settings, and start trading.' },

        // ─── TOPICS (virtual entries for common searches) ───
        { url: 'docs.html#installation', title: 'Installation Guide', category: 'Guides', keywords: 'install installation how to install ea metatrader 5 mt5 mql5 experts folder data folder navigator drag chart', description: 'How to install the EA: download .ex5 → place in MQL5/Experts → restart MT5 → drag onto chart.' },
        { url: 'docs.html#activation', title: 'Activation & Licensing', category: 'Guides', keywords: 'activate activation license licensing key token validate validation server account number broker login', description: 'Activate your license: paste Server URL and Secret Token in EA inputs. License validates automatically.' },
        { url: 'docs.html#dashboard', title: 'Dashboard Guide', category: 'Guides', keywords: 'dashboard remote control phone mobile monitor positions profit target enable disable pause resume emergency stop', description: 'Use the Remote Dashboard to monitor and control your EA from any device.' },
        { url: 'docs.html#daily-target', title: 'Daily Target System', category: 'Guides', keywords: 'daily target system dts profit goal stop trading percentage base equity reached hit reset rollover', description: 'The Daily Target System automatically stops trading after reaching your daily profit goal.' },
        { url: 'docs.html#risk', title: 'Risk Management', category: 'Guides', keywords: 'risk management position size lot size stop loss take profit drawdown atr dynamic sizing equity protection', description: 'Dynamic position sizing, ATR-based stops, drawdown limits, and equity protection.' },
        { url: 'docs.html#ai-chat', title: 'AI Chat', category: 'Guides', keywords: 'ai chat assistant ask questions help support talk conversation intelligent commands voice', description: 'The AI Chat inside the dashboard can answer questions and execute commands for you.' },
        { url: 'support.html#not-trading', title: 'EA Not Trading?', category: 'Troubleshooting', keywords: 'not trading no trades why ea stopped working inactive idle confidence threshold 97 percent daily target reached', description: 'Common reasons: confidence below 97%, daily target reached, Allow Algo Trading disabled, EA not attached.' },
        { url: 'support.html#offline', title: 'Dashboard Offline?', category: 'Troubleshooting', keywords: 'dashboard offline disconnected not connecting error token wrong endpoint url refresh', description: 'Check: correct Secret Token, internet connection, try refreshing. Token is in your welcome email.' },
        { url: 'support.html#update', title: 'How to Update EA', category: 'Troubleshooting', keywords: 'update ea new version upgrade replace ex5 file restart metatrader latest', description: 'Download new .ex5 → replace old file in MQL5/Experts → restart MT5. Check changelog for what\'s new.' },
        { url: 'support.html#license', title: 'License Issues', category: 'Troubleshooting', keywords: 'license failed invalid error validation check internet connection endpoint url token expired', description: 'License validation failed? Check internet, verify URL and token, ensure account is registered.' },
        { url: 'support.html#devices', title: 'Device Limit', category: 'Troubleshooting', keywords: 'device limit maximum 3 devices too many sessions login remove clear', description: 'Maximum 3 devices per account. Remove old devices from Account page or contact support.' },
        { url: 'pricing.html#trial', title: 'Free Trial', category: 'Subscription', keywords: 'free trial 7 days no credit card required test try demo full access', description: '7-day free trial with full access to all features. No credit card required to start.' },
        { url: 'docs.html#symbols', title: 'Supported Symbols', category: 'Guides', keywords: 'symbols instruments pairs gold xauusd dow jones us30 dj30 nasdaq us100 nas100 bitcoin btcusd forex', description: 'Supported instruments: XAUUSD, US30/DJ30, US100/NAS100, BTCUSD, and more.' },
        { url: 'docs.html#timeframe', title: 'Recommended Timeframe', category: 'Guides', keywords: 'timeframe h1 1 hour recommended best chart period multi timeframe analysis internal', description: 'H1 (1 hour) is recommended. The EA internally analyzes multiple timeframes regardless of chart.' },
        { url: 'docs.html#vps', title: 'VPS Setup', category: 'Guides', keywords: 'vps virtual private server 24 7 always on running remote desktop cloud hosting', description: 'Run the EA 24/7 on a VPS for uninterrupted trading even when your PC is off.' }
    ];

    // ── SEARCH ENGINE ──
    function search(query) {
        if (!query || query.length < 2) return [];
        var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length >= 2; });
        if (!terms.length) return [];

        var results = [];
        for (var i = 0; i < INDEX.length; i++) {
            var item = INDEX[i];
            var searchable = (item.title + ' ' + item.keywords + ' ' + item.description + ' ' + item.category).toLowerCase();
            var score = 0;

            for (var j = 0; j < terms.length; j++) {
                var term = terms[j];
                // Exact word match = 10 points
                if (searchable.indexOf(term) >= 0) {
                    score += 10;
                    // Title match bonus
                    if (item.title.toLowerCase().indexOf(term) >= 0) score += 15;
                    // Category match bonus
                    if (item.category.toLowerCase().indexOf(term) >= 0) score += 5;
                }
                // Partial match (3+ chars) = 3 points
                else if (term.length >= 3) {
                    var words = searchable.split(/\s+/);
                    for (var k = 0; k < words.length; k++) {
                        if (words[k].indexOf(term) >= 0 || term.indexOf(words[k]) >= 0) {
                            score += 3;
                            break;
                        }
                    }
                }
            }

            if (score > 0) {
                results.push({ item: item, score: score });
            }
        }

        // Sort by score descending
        results.sort(function(a, b) { return b.score - a.score; });
        return results.slice(0, 10);
    }

    // ── SUGGESTIONS ──
    function getSuggestions(query) {
        if (!query || query.length < 2) return [];
        var q = query.toLowerCase();
        var suggestions = [];
        for (var i = 0; i < INDEX.length; i++) {
            if (INDEX[i].title.toLowerCase().indexOf(q) >= 0 || INDEX[i].keywords.indexOf(q) >= 0) {
                suggestions.push(INDEX[i].title);
                if (suggestions.length >= 5) break;
            }
        }
        return suggestions;
    }

    // ── CREATE SEARCH UI ──
    function createSearchUI() {
        // Search button in nav
        var navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        var searchBtn = document.createElement('a');
        searchBtn.href = '#';
        searchBtn.innerHTML = '🔍';
        searchBtn.title = 'Search';
        searchBtn.style.cssText = 'font-size:18px;text-decoration:none;cursor:pointer;padding:4px 8px;';
        searchBtn.onclick = function(e) { e.preventDefault(); toggleSearch(); };
        // Insert before last items
        var firstLink = navLinks.firstChild;
        if (firstLink) navLinks.insertBefore(searchBtn, firstLink);
        else navLinks.appendChild(searchBtn);

        // Search overlay
        var overlay = document.createElement('div');
        overlay.id = 'falcon-search-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:none;flex-direction:column;align-items:center;padding-top:12vh;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;';
        overlay.innerHTML = ''
            + '<div style="width:90%;max-width:600px;">'
            + '  <div style="position:relative;">'
            + '    <input id="falcon-search-input" type="text" placeholder="Search documentation, guides, features..." autocomplete="off" style="width:100%;padding:16px 50px 16px 20px;font-size:16px;background:#161b22;border:2px solid rgba(0,217,255,0.3);border-radius:12px;color:#e6edf3;outline:none;font-family:inherit;">'
            + '    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:20px;opacity:0.5;">🔍</span>'
            + '  </div>'
            + '  <div id="falcon-search-suggestions" style="margin-top:4px;"></div>'
            + '  <div id="falcon-search-results" style="margin-top:12px;max-height:55vh;overflow-y:auto;"></div>'
            + '  <div style="text-align:center;margin-top:16px;">'
            + '    <button id="falcon-search-ai-btn" style="display:none;background:linear-gradient(135deg,#00d9ff,#00ff88);border:none;color:#0d1117;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;cursor:pointer;">🤖 Ask AI Assistant Instead</button>'
            + '  </div>'
            + '  <div style="text-align:center;margin-top:12px;font-size:11px;color:#5b6580;">Press <kbd style="background:#2a3142;padding:2px 6px;border-radius:4px;color:#8b94a8;">ESC</kbd> to close · <kbd style="background:#2a3142;padding:2px 6px;border-radius:4px;color:#8b94a8;">Ctrl+K</kbd> to open</div>'
            + '</div>';
        overlay.onclick = function(e) { if (e.target === overlay) closeSearch(); };
        document.body.appendChild(overlay);

        // Events
        var input = document.getElementById('falcon-search-input');
        input.oninput = function() { performSearch(input.value); };
        input.onkeydown = function(e) {
            if (e.key === 'Escape') closeSearch();
            if (e.key === 'Enter') {
                var results = search(input.value);
                if (results.length > 0) {
                    window.location.href = results[0].item.url;
                }
            }
        };

        // AI button
        document.getElementById('falcon-search-ai-btn').onclick = function() {
            closeSearch();
            // Trigger AI chat with the search query
            var query = input.value;
            setTimeout(function() {
                var aiBtn = document.getElementById('wai-btn');
                if (aiBtn) aiBtn.click();
                setTimeout(function() {
                    var aiInput = document.getElementById('wai-input');
                    if (aiInput) { aiInput.value = query; aiInput.dispatchEvent(new Event('input')); }
                }, 300);
            }, 200);
        };

        // Keyboard shortcut: Ctrl+K or Cmd+K
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch();
            }
            if (e.key === 'Escape' && isSearchOpen()) closeSearch();
        });
    }

    function isSearchOpen() {
        var overlay = document.getElementById('falcon-search-overlay');
        return overlay && overlay.style.display === 'flex';
    }

    function toggleSearch() {
        if (isSearchOpen()) closeSearch();
        else openSearch();
    }

    function openSearch() {
        var overlay = document.getElementById('falcon-search-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        var input = document.getElementById('falcon-search-input');
        if (input) { input.value = ''; input.focus(); }
        document.getElementById('falcon-search-results').innerHTML = renderPopular();
        document.getElementById('falcon-search-suggestions').innerHTML = '';
        document.getElementById('falcon-search-ai-btn').style.display = 'none';
    }

    function closeSearch() {
        var overlay = document.getElementById('falcon-search-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function renderPopular() {
        var popular = ['How to install', 'Free trial', 'Dashboard setup', 'Not trading', 'Pricing', 'Update EA'];
        return '<div style="color:#5b6580;font-size:12px;margin-bottom:8px;">Popular searches:</div>'
            + '<div style="display:flex;flex-wrap:wrap;gap:6px;">'
            + popular.map(function(p) {
                return '<button onclick="document.getElementById(\'falcon-search-input\').value=\'' + p + '\';document.getElementById(\'falcon-search-input\').dispatchEvent(new Event(\'input\'));" style="background:rgba(0,217,255,0.08);border:1px solid rgba(0,217,255,0.2);color:#00d9ff;font-size:11px;padding:5px 10px;border-radius:14px;cursor:pointer;font-family:inherit;">' + p + '</button>';
            }).join('')
            + '</div>';
    }

    function performSearch(query) {
        var resultsEl = document.getElementById('falcon-search-results');
        var suggestEl = document.getElementById('falcon-search-suggestions');
        var aiBtn = document.getElementById('falcon-search-ai-btn');

        if (!query || query.length < 2) {
            resultsEl.innerHTML = renderPopular();
            suggestEl.innerHTML = '';
            aiBtn.style.display = 'none';
            return;
        }

        var results = search(query);

        // Suggestions
        var suggestions = getSuggestions(query);
        if (suggestions.length > 0) {
            suggestEl.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;">'
                + suggestions.map(function(s) {
                    return '<span onclick="document.getElementById(\'falcon-search-input\').value=\'' + s.replace(/'/g, "\\'") + '\';document.getElementById(\'falcon-search-input\').dispatchEvent(new Event(\'input\'));" style="font-size:11px;color:#8b94a8;cursor:pointer;padding:3px 8px;background:rgba(255,255,255,0.04);border-radius:4px;">' + s + '</span>';
                }).join('')
                + '</div>';
        } else {
            suggestEl.innerHTML = '';
        }

        // Results
        if (results.length === 0) {
            resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:#5b6580;font-size:13px;">'
                + '<p style="font-size:24px;margin-bottom:8px;">🔍</p>'
                + '<p>No results found for "<strong style="color:#e6edf3;">' + escapeHtml(query) + '</strong>"</p>'
                + '<p style="margin-top:8px;font-size:11px;">Try different keywords or ask the AI Assistant</p>'
                + '</div>';
            aiBtn.style.display = 'inline-block';
            return;
        }

        aiBtn.style.display = 'inline-block';
        var html = '';
        results.forEach(function(r) {
            var item = r.item;
            html += '<a href="' + item.url + '" style="display:block;padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:6px;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(0,217,255,0.06)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.03)\'">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
            html += '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(0,217,255,0.1);color:#00d9ff;font-weight:600;">' + item.category + '</span>';
            html += '<span style="color:#e6edf3;font-size:14px;font-weight:600;">' + highlightMatch(item.title, query) + '</span>';
            html += '</div>';
            html += '<p style="color:#8b94a8;font-size:12px;margin:0;line-height:1.5;">' + highlightMatch(item.description, query) + '</p>';
            html += '</a>';
        });
        resultsEl.innerHTML = html;
    }

    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        var escaped = escapeHtml(text);
        var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length >= 2; });
        terms.forEach(function(term) {
            var regex = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            escaped = escaped.replace(regex, '<mark style="background:rgba(0,217,255,0.2);color:#00d9ff;padding:0 1px;border-radius:2px;">$1</mark>');
        });
        return escaped;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Initialize ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSearchUI);
    } else {
        createSearchUI();
    }
})();
