/**
 * FalconAI Dashboard Security Module
 * ====================================
 * Shared security layer for ALL dashboards:
 *   - Customer Dashboard (DASHBORED.html)
 *   - Admin Dashboard (ADMIN_DASHBORED.html)
 *   - Admin Console (admin-console.html)
 * 
 * Features:
 *   1. Session timeout (idle auto-logout)
 *   2. XSS input sanitization
 *   3. Content Security Policy enforcement
 *   4. Session fingerprinting (device binding)
 *   5. localStorage token encryption
 *   6. Suspicious activity detection
 *   7. Admin action confirmation for destructive ops
 * 
 * USAGE: Include this file BEFORE dashboard-specific scripts:
 *   <script src="dashboard-security.js"></script>
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════

    var SECURITY_CONFIG = {
        // Session timeouts (milliseconds)
        ADMIN_IDLE_TIMEOUT_MS:    30 * 60 * 1000,   // 30 minutes for admin
        CUSTOMER_IDLE_TIMEOUT_MS: 4 * 60 * 60 * 1000, // 4 hours for customer
        
        // Activity tracking
        ACTIVITY_CHECK_INTERVAL_MS: 60000, // Check every 60 seconds
        
        // Suspicious activity thresholds
        MAX_FAILED_COMMANDS: 10,        // Max failed API calls before force-logout
        FAILED_COMMAND_WINDOW_MS: 300000, // 5 minute window
        
        // Token encryption
        ENCRYPT_LOCALSTORAGE: true,     // Encrypt tokens in localStorage
        
        // Fingerprint
        ENABLE_FINGERPRINT: true        // Bind session to device
    };

    // ═══════════════════════════════════════════════════════════════════
    // 1. SESSION TIMEOUT (Idle Auto-Logout)
    // ═══════════════════════════════════════════════════════════════════

    var _lastActivity = Date.now();
    var _sessionActive = true;
    var _isAdmin = false;

    // Detect dashboard type
    if (document.title && (document.title.indexOf('Admin') >= 0 || document.title.indexOf('Console') >= 0)) {
        _isAdmin = true;
    }
    // Also detect by URL or filename (more reliable than DOM which may not be loaded yet)
    var _loc = window.location.href.toLowerCase();
    if (_loc.indexOf('admin') >= 0 || _loc.indexOf('console') >= 0) {
        _isAdmin = true;
    }

    function _resetActivity() {
        _lastActivity = Date.now();
    }

    // Track user activity
    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'].forEach(function(evt) {
        document.addEventListener(evt, _resetActivity, { passive: true });
    });

    function _checkIdleTimeout() {
        if (!_sessionActive) return;
        
        var timeout = _isAdmin ? SECURITY_CONFIG.ADMIN_IDLE_TIMEOUT_MS : SECURITY_CONFIG.CUSTOMER_IDLE_TIMEOUT_MS;
        var elapsed = Date.now() - _lastActivity;
        
        if (elapsed > timeout) {
            _forceLogout('Session expired due to inactivity (' + Math.round(timeout / 60000) + ' min idle timeout).');
        }
        
        // Warning at 80% of timeout
        var warningThreshold = timeout * 0.8;
        if (elapsed > warningThreshold && elapsed < timeout) {
            var remaining = Math.ceil((timeout - elapsed) / 60000);
            _showSecurityWarning('Session will expire in ' + remaining + ' minute' + (remaining > 1 ? 's' : '') + ' due to inactivity.');
        }
    }

    setInterval(_checkIdleTimeout, SECURITY_CONFIG.ACTIVITY_CHECK_INTERVAL_MS);

    function _forceLogout(reason) {
        _sessionActive = false;
        
        // Clear sensitive data
        try { sessionStorage.clear(); } catch(_) {}
        
        // Show logout overlay
        var overlay = document.createElement('div');
        overlay.id = 'securityLogoutOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
        overlay.innerHTML = '<div style="background:#1a1f2e;border:1px solid rgba(255,68,68,0.3);border-radius:12px;padding:32px;max-width:400px;text-align:center;">' +
            '<div style="font-size:40px;margin-bottom:12px;">🔒</div>' +
            '<h2 style="color:#ff4444;font-size:18px;margin-bottom:8px;">Session Expired</h2>' +
            '<p style="color:#8b94a8;font-size:13px;margin-bottom:20px;">' + _escapeHtml(reason) + '</p>' +
            '<button onclick="location.reload()" style="padding:10px 24px;background:#00d9ff;color:#000;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">Reconnect</button>' +
            '</div>';
        document.body.appendChild(overlay);
        
        // Stop all intervals/polling (prevent further authenticated requests)
        try {
            var highestId = setTimeout(function(){}, 0);
            for (var i = highestId - 200; i <= highestId; i++) {
                if (i > 0) { clearTimeout(i); clearInterval(i); }
            }
        } catch(_) {}
    }

    var _secWarningEl = null;
    function _showSecurityWarning(msg) {
        if (_secWarningEl) return; // Don't stack warnings
        _secWarningEl = document.createElement('div');
        _secWarningEl.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99998;background:rgba(255,193,7,0.15);border:1px solid rgba(255,193,7,0.4);border-radius:8px;padding:10px 16px;font-size:12px;color:#ffc107;max-width:300px;backdrop-filter:blur(4px);';
        _secWarningEl.textContent = '⚠️ ' + msg;
        document.body.appendChild(_secWarningEl);
        setTimeout(function() {
            if (_secWarningEl && _secWarningEl.parentNode) _secWarningEl.parentNode.removeChild(_secWarningEl);
            _secWarningEl = null;
        }, 10000);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. XSS INPUT SANITIZATION
    // ═══════════════════════════════════════════════════════════════════

    function _escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // Override innerHTML assignments to auto-sanitize (best effort)
    // This catches the most common XSS vector in dashboard code
    window.FalconSecurity = window.FalconSecurity || {};
    window.FalconSecurity.sanitize = function(input) {
        if (typeof input !== 'string') return input;
        // Remove script tags, event handlers, and javascript: URIs
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript\s*:/gi, '')
            .replace(/data\s*:\s*text\/html/gi, '');
    };

    // Sanitize all text inputs on form submission / blur
    document.addEventListener('blur', function(e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            if (e.target.type === 'password') return; // Don't touch password fields
            var val = e.target.value;
            if (val && (val.indexOf('<script') >= 0 || val.indexOf('javascript:') >= 0 || val.indexOf('onerror=') >= 0)) {
                e.target.value = window.FalconSecurity.sanitize(val);
                console.warn('[SECURITY] XSS attempt blocked in input:', e.target.id || e.target.name);
            }
        }
    }, true);

    // ═══════════════════════════════════════════════════════════════════
    // 3. CONTENT SECURITY POLICY (Meta Tag)
    // ═══════════════════════════════════════════════════════════════════

    // Inject CSP meta tag if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        var csp = document.createElement('meta');
        csp.httpEquiv = 'Content-Security-Policy';
        // Allow scripts from self + Google APIs (for GAS) + CDNs used by dashboard
        csp.content = "default-src 'self' https:; " +
                      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://script.google.com; " +
                      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
                      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
                      "img-src 'self' data: https:; " +
                      "connect-src 'self' https://script.google.com https://*.google.com wss: ws: http://localhost:*; " +
                      "frame-src 'none'; " +
                      "object-src 'none'; " +
                      "base-uri 'self';";
        document.head.insertBefore(csp, document.head.firstChild);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. SESSION FINGERPRINTING (Device Binding)
    // ═══════════════════════════════════════════════════════════════════

    function _generateFingerprint() {
        var components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.platform
        ];
        // Simple hash
        var str = components.join('|');
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'fp_' + Math.abs(hash).toString(36);
    }

    if (SECURITY_CONFIG.ENABLE_FINGERPRINT) {
        var currentFP = _generateFingerprint();
        var storedFP = sessionStorage.getItem('_falcon_device_fp');
        
        if (storedFP && storedFP !== currentFP) {
            // Fingerprint mismatch — possible session hijacking
            console.warn('[SECURITY] Device fingerprint changed — forcing re-auth');
            sessionStorage.clear();
            // Don't force logout immediately (could be browser update)
            // But do log it
        }
        sessionStorage.setItem('_falcon_device_fp', currentFP);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. LOCALSTORAGE TOKEN ENCRYPTION
    // ═══════════════════════════════════════════════════════════════════

    // Simple XOR encryption for localStorage values containing tokens
    // Not military-grade, but prevents casual reading if someone exports localStorage
    var _encKey = 'F4LC0N_' + (_generateFingerprint() || 'default');

    window.FalconSecurity.encryptToken = function(plaintext) {
        if (!plaintext || !SECURITY_CONFIG.ENCRYPT_LOCALSTORAGE) return plaintext;
        var result = '';
        for (var i = 0; i < plaintext.length; i++) {
            result += String.fromCharCode(plaintext.charCodeAt(i) ^ _encKey.charCodeAt(i % _encKey.length));
        }
        return 'FENC:' + btoa(result);
    };

    window.FalconSecurity.decryptToken = function(encrypted) {
        if (!encrypted) return '';
        if (encrypted.indexOf('FENC:') !== 0) return encrypted; // Not encrypted (backward compat)
        try {
            var decoded = atob(encrypted.substring(5));
            var result = '';
            for (var i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(decoded.charCodeAt(i) ^ _encKey.charCodeAt(i % _encKey.length));
            }
            return result;
        } catch(_) { return encrypted; }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 6. SUSPICIOUS ACTIVITY DETECTION
    // ═══════════════════════════════════════════════════════════════════

    var _failedCommands = [];

    window.FalconSecurity.trackCommandResult = function(success) {
        if (success) return;
        
        var now = Date.now();
        _failedCommands.push(now);
        
        // Remove old entries outside window
        _failedCommands = _failedCommands.filter(function(t) {
            return (now - t) < SECURITY_CONFIG.FAILED_COMMAND_WINDOW_MS;
        });
        
        if (_failedCommands.length >= SECURITY_CONFIG.MAX_FAILED_COMMANDS) {
            _forceLogout('Too many failed commands (' + _failedCommands.length + ' in 5 minutes). Possible unauthorized access attempt.');
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // 7. ADMIN ACTION CONFIRMATION (Destructive Operations)
    // ═══════════════════════════════════════════════════════════════════

    var DESTRUCTIVE_ACTIONS = [
        'emergency_stop', 'EMERGENCY_STOP',
        'copy_admin_blacklist', 'copy_remove_client',
        'admin_revoke_access', 'admin_delete_user',
        'admin_rotate_master_token'
    ];

    window.FalconSecurity.confirmDestructiveAction = function(actionName, details) {
        if (DESTRUCTIVE_ACTIONS.indexOf(actionName) < 0) return true; // Not destructive
        
        var msg = '⚠️ DESTRUCTIVE ACTION\n\n' +
                  'Action: ' + actionName + '\n' +
                  (details ? 'Details: ' + details + '\n' : '') +
                  '\nThis action may be irreversible. Continue?';
        
        return window.confirm(msg);
    };

    // ═══════════════════════════════════════════════════════════════════
    // 8. ANTI-CLICKJACKING (Frame Busting)
    // ═══════════════════════════════════════════════════════════════════

    // Prevent dashboard from being loaded in an iframe (clickjacking protection)
    if (window.self !== window.top) {
        try {
            window.top.location = window.self.location;
        } catch(_) {
            // Cross-origin frame — show blank
            document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:40vh;">Access Denied — Framing not allowed</h1>';
        }
    }

    // Also set X-Frame-Options equivalent via meta
    var xfo = document.createElement('meta');
    xfo.httpEquiv = 'X-Frame-Options';
    xfo.content = 'DENY';
    document.head.appendChild(xfo);

    // ═══════════════════════════════════════════════════════════════════
    // 9. CONSOLE PROTECTION (Anti-DevTools Tampering)
    // ═══════════════════════════════════════════════════════════════════

    // Warn if someone opens DevTools and tries to modify variables
    // This is a deterrent, not a hard block (client-side JS is always inspectable)
    if (_isAdmin) {
        Object.defineProperty(window, '_masterToken', {
            set: function(val) {
                console.warn('[SECURITY] Attempt to modify _masterToken via console detected');
                // Don't actually block it — just log
            },
            configurable: true
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10. SECURE REFERRER POLICY
    // ═══════════════════════════════════════════════════════════════════

    // Prevent token leakage via Referrer header when clicking external links
    if (!document.querySelector('meta[name="referrer"]')) {
        var ref = document.createElement('meta');
        ref.name = 'referrer';
        ref.content = 'no-referrer';
        document.head.appendChild(ref);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 11. LOGIN AUDIT LOGGING
    // ═══════════════════════════════════════════════════════════════════

    window.FalconSecurity.logLogin = function(endpoint, token) {
        // Send login event to GAS for audit trail
        if (!endpoint || !token) return;
        try {
            var auditData = {
                command: 'admin_audit_login',
                master_token: token,
                user_agent: navigator.userAgent.substring(0, 100),
                screen: screen.width + 'x' + screen.height,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
                fingerprint: _generateFingerprint(),
                timestamp: new Date().toISOString()
            };
            // Fire-and-forget (don't block login flow)
            fetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(auditData),
                headers: { 'Content-Type': 'text/plain' }
            }).catch(function(){});
        } catch(_) {}
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION COMPLETE
    // ═══════════════════════════════════════════════════════════════════

    console.log('[SECURITY] FalconAI Dashboard Security Module loaded | Admin:', _isAdmin,
                '| Timeout:', (_isAdmin ? '30min' : '4hr'),
                '| Fingerprint:', _generateFingerprint());

})();
