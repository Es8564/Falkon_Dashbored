/**
 * Falcon AI — Universal Back Navigation
 * Adds a floating "← Back" button to all website pages.
 * Uses browser history when available, falls back to referrer or account page.
 * Does NOT show on the homepage (index.html).
 */
(function() {
    // Don't show back button on homepage
    var path = window.location.pathname;
    if (path === '/' || path.endsWith('/index.html') || path.endsWith('/Falkon_Dashbored/') || path === '') return;

    // Don't add if page is a standalone dashboard (opened as PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;

    // Create the back button
    var btn = document.createElement('button');
    btn.id = 'falconBackBtn';
    btn.innerHTML = '← Back';
    btn.setAttribute('aria-label', 'Go back to previous page');
    btn.title = 'Return to previous page';

    // Style
    btn.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'left:24px',
        'z-index:9999',
        'background:rgba(22,27,34,0.92)',
        'border:1px solid rgba(255,255,255,0.12)',
        'color:#e6edf3',
        'font-size:13px',
        'font-weight:600',
        'font-family:inherit',
        'padding:10px 18px',
        'border-radius:10px',
        'cursor:pointer',
        'backdrop-filter:blur(12px)',
        '-webkit-backdrop-filter:blur(12px)',
        'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
        'transition:all 0.2s ease',
        'touch-action:manipulation',
        'user-select:none',
        '-webkit-tap-highlight-color:transparent'
    ].join(';');

    // Hover effects
    btn.addEventListener('mouseenter', function() {
        btn.style.background = 'rgba(0,217,255,0.12)';
        btn.style.borderColor = 'rgba(0,217,255,0.4)';
        btn.style.color = '#00d9ff';
    });
    btn.addEventListener('mouseleave', function() {
        btn.style.background = 'rgba(22,27,34,0.92)';
        btn.style.borderColor = 'rgba(255,255,255,0.12)';
        btn.style.color = '#e6edf3';
    });

    // Click handler — smart back navigation
    btn.addEventListener('click', function() {
        // If there's browser history, use it (most reliable)
        if (window.history.length > 1) {
            window.history.back();
        } else if (document.referrer && document.referrer.indexOf(window.location.host) !== -1) {
            // Same-site referrer
            window.location.href = document.referrer;
        } else {
            // Fallback: go to account page (most likely entry point) or home
            var token = '';
            try { token = JSON.parse(localStorage.getItem('falconConfig') || '{}').secretToken || ''; } catch(_){}
            window.location.href = token ? 'account.html' : 'index.html';
        }
    });

    // Append to body when DOM is ready
    if (document.body) {
        document.body.appendChild(btn);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            document.body.appendChild(btn);
        });
    }
})();
