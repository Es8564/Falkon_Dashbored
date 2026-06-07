// Falcon AI — Shared navigation auth state
// Shows profile badge when user is logged in, hides Login/Register links
(function() {
    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('falconConfig') || '{}'); } catch (_) {}
    var token = cfg.secretToken || '';
    var name = localStorage.getItem('falcon_user_name') || '';

    if (token && name) {
        // User is logged in — show profile badge in navbar
        var navLinks = document.querySelectorAll('.nav-links');
        navLinks.forEach(function(nav) {
            // Remove "Login" and "Get Started/Register" links
            var links = nav.querySelectorAll('a');
            links.forEach(function(a) {
                if (a.href.indexOf('login.html') >= 0 || a.href.indexOf('register.html') >= 0) {
                    a.style.display = 'none';
                }
            });
            // Add profile badge if not already there (skip if page already shows user name)
            if (!nav.querySelector('.nav-profile-badge') && !nav.querySelector('[href="account.html"] span')) {
                // Check if nav already has a badge-like element (from page-specific scripts)
                var existingBadges = nav.querySelectorAll('span, a');
                var alreadyHasBadge = false;
                for (var i = 0; i < existingBadges.length; i++) {
                    if (existingBadges[i].textContent.trim() === name.charAt(0).toUpperCase() ||
                        existingBadges[i].textContent.trim() === name) {
                        alreadyHasBadge = true;
                        break;
                    }
                }
                if (!alreadyHasBadge) {
                    var badge = document.createElement('a');
                    badge.href = 'account.html';
                    badge.className = 'nav-profile-badge';
                    badge.style.cssText = 'width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#00ff88);color:#0d1117;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-decoration:none;';
                    badge.textContent = name.charAt(0).toUpperCase();
                    badge.title = name + ' — My Account';
                    nav.appendChild(badge);
                }
            }
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
