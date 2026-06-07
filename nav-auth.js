// Falcon AI — Shared navigation auth state
// Shows profile badge when user is logged in, hides Login/Register links
(function() {
    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('falconConfig') || '{}'); } catch (_) {}
    var token = cfg.secretToken || '';
    var name = localStorage.getItem('falcon_user_name') || '';

    if (token && name) {
        // Don't add badge — other inline scripts on each page already handle this
        // Only hide login/register links
        var navLinks = document.querySelectorAll('.nav-links');
        navLinks.forEach(function(nav) {
            var links = nav.querySelectorAll('a');
            links.forEach(function(a) {
                if (a.href.indexOf('login.html') >= 0 || a.href.indexOf('register.html') >= 0) {
                    a.style.display = 'none';
                }
            });
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
