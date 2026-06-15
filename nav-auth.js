// Falcon AI — Shared navigation auth state
// Shows profile dropdown menu when user is logged in
(function() {
    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('falconConfig') || '{}'); } catch (_) {}
    var token = cfg.secretToken || '';
    var name = localStorage.getItem('falcon_user_name') || '';

    if (token && name) {
        var navLinks = document.querySelectorAll('.nav-links');
        navLinks.forEach(function(nav) {
            // Hide login/register links
            var links = nav.querySelectorAll('a');
            links.forEach(function(a) {
                if (a.href.indexOf('login.html') >= 0 || a.href.indexOf('register.html') >= 0) {
                    a.style.display = 'none';
                }
                // Hide "My Account" text link (it's now inside the dropdown)
                if (a.href.indexOf('account.html') >= 0 && !a.classList.contains('nav-logo')) {
                    a.style.display = 'none';
                }
            });
            // Hide any existing badge spans added by inline scripts
            var spans = nav.querySelectorAll('span');
            spans.forEach(function(s) {
                if (s.style.borderRadius === '50%' && s.textContent.trim().length === 1) {
                    s.style.display = 'none';
                }
            });

            // Create dropdown container
            if (nav.querySelector('.nav-profile-dropdown')) return; // already added
            var dropdown = document.createElement('div');
            dropdown.className = 'nav-profile-dropdown';
            dropdown.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

            // Profile badge button
            var badge = document.createElement('div');
            badge.style.cssText = 'width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#00ff88);color:#0d1117;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;';
            badge.textContent = name.charAt(0).toUpperCase();
            badge.title = name;

            // Dropdown menu
            var menu = document.createElement('div');
            menu.style.cssText = 'display:none;position:absolute;top:42px;right:0;background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 0;min-width:180px;box-shadow:0 8px 30px rgba(0,0,0,0.5);z-index:9999;';
            menu.innerHTML = ''
                + '<div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px;">'
                + '  <div style="font-size:13px;font-weight:700;color:#e6edf3;">' + name + '</div>'
                + '  <div style="font-size:11px;color:#5b6580;">' + (localStorage.getItem('falcon_user_email') || '') + '</div>'
                + '</div>'
                + '<a href="account.html" style="display:block;padding:8px 16px;font-size:12px;color:#c8d0df;text-decoration:none;transition:background 0.15s;">👤 My Account</a>'
                + '<a href="account.html#subscription" style="display:block;padding:8px 16px;font-size:12px;color:#c8d0df;text-decoration:none;transition:background 0.15s;">💳 Subscription</a>'
                + '<a href="download.html" style="display:block;padding:8px 16px;font-size:12px;color:#c8d0df;text-decoration:none;transition:background 0.15s;">📥 Downloads</a>'
                + '<a href="support.html" style="display:block;padding:8px 16px;font-size:12px;color:#c8d0df;text-decoration:none;transition:background 0.15s;">💬 Support</a>'
                + '<div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;padding-top:4px;"></div>'
                + '<a href="#" onclick="localStorage.removeItem(\'falconConfig\');localStorage.removeItem(\'falcon_user_name\');localStorage.removeItem(\'falcon_user_email\');window.location.href=\'login.html\';return false;" style="display:block;padding:8px 16px;font-size:12px;color:#ff6b6b;text-decoration:none;transition:background 0.15s;">🚪 Logout</a>';

            // Hover effects on menu items
            var menuLinks = menu.querySelectorAll('a');
            menuLinks.forEach(function(a) {
                a.onmouseover = function() { a.style.background = 'rgba(255,255,255,0.06)'; };
                a.onmouseout = function() { a.style.background = 'transparent'; };
            });

            // Toggle menu on click
            badge.onclick = function(e) {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            };
            // Close on click outside
            document.addEventListener('click', function() { menu.style.display = 'none'; });

            dropdown.appendChild(badge);
            dropdown.appendChild(menu);
            nav.appendChild(dropdown);
        });
    }
})();

// ── Load Live Chat Widget on all pages ──
(function() {
    // Don't load on dashboards or admin pages (they have their own chat)
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('dashbored') >= 0 || path.indexOf('admin') >= 0) return;
    var s = document.createElement('script');
    s.src = 'live-chat.js';
    s.defer = true;
    document.body.appendChild(s);
})();

// ── Load AI Chat Assistant on all website pages ──
(function() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('dashbored') >= 0 || path.indexOf('admin') >= 0) return;
    var s = document.createElement('script');
    s.src = 'website-ai-chat.js';
    s.defer = true;
    document.body.appendChild(s);
})();

// ── Delayed cleanup: remove any duplicate badges added by inline scripts ──
(function() {
    setTimeout(function() {
        var navLinks = document.querySelectorAll('.nav-links');
        navLinks.forEach(function(nav) {
            // Find and hide any span badges that aren't part of our dropdown
            var spans = nav.querySelectorAll('span');
            spans.forEach(function(s) {
                if (s.textContent.trim().length === 1 && s.style.cursor === 'pointer' && !s.closest('.nav-profile-dropdown')) {
                    s.style.display = 'none';
                }
            });
        });
    }, 500); // Run 500ms after page load to catch inline scripts
})();
