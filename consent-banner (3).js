/**
 * Falcon AI — GDPR/Privacy Consent Banner
 * Include this script on all public pages (after nav-auth.js).
 * Shows a non-intrusive bottom banner on first visit.
 * Stores acceptance in localStorage so it only shows once.
 */
(function() {
    // If already accepted, don't show
    if (localStorage.getItem('falcon_consent_accepted')) return;

    // Create banner element
    var banner = document.createElement('div');
    banner.id = 'consentBanner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(13,17,23,0.97);border-top:1px solid rgba(0,217,255,0.2);padding:14px 20px;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;font-family:system-ui,sans-serif;backdrop-filter:blur(10px);';

    var text = document.createElement('p');
    text.style.cssText = 'color:#8b94a8;font-size:13px;margin:0;max-width:600px;line-height:1.5;';
    text.innerHTML = 'We use localStorage to save your preferences and session data. No tracking cookies are used. By continuing, you agree to our <a href="privacy.html" style="color:#00d9ff;text-decoration:none;">Privacy Policy</a>.';

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = 'background:linear-gradient(135deg,#00d9ff,#00ff88);color:#0d1117;border:none;padding:8px 20px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0;';
    acceptBtn.onclick = function() {
        localStorage.setItem('falcon_consent_accepted', Date.now());
        banner.remove();
    };

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:#5b6580;font-size:16px;cursor:pointer;padding:4px 8px;flex-shrink:0;';
    closeBtn.onclick = function() {
        localStorage.setItem('falcon_consent_accepted', Date.now());
        banner.remove();
    };

    banner.appendChild(text);
    banner.appendChild(acceptBtn);
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);
})();
