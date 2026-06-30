/**
 * Falcon Quant — Executive PDF Report Generator
 * ================================================
 * Client-side PDF generation using jsPDF.
 * Produces a 2-page institutional-grade report:
 *   Page 1: Live Fleet Status (equity, drawdown, aggregate exposure)
 *   Page 2: 24-Hour Historical Ledger (AI events, alerts, compliance)
 * 
 * Usage: FalconReport.generate(relayData, gasAuditData);
 * Requires: jsPDF library loaded via CDN
 */

var FalconReport = (function() {

    function generate(exposureData, auditEntries) {
        if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please check your internet connection.');
            return;
        }
        var jsPDF = window.jspdf.jsPDF;
        var doc = new jsPDF('p', 'mm', 'a4');
        var W = 210, H = 297;
        var margin = 15;
        var y = 0;

        // ═══ PAGE 1: LIVE FLEET STATUS ═══
        // Header
        doc.setFillColor(13, 17, 23);
        doc.rect(0, 0, W, H, 'F');

        // Logo & Title
        doc.setTextColor(0, 217, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('FALCON QUANT', margin, 20);
        doc.setFontSize(10);
        doc.setTextColor(139, 148, 168);
        doc.text('Enterprise Fleet Risk Report', margin, 27);

        // Generation timestamp
        doc.setFontSize(8);
        doc.setTextColor(91, 101, 128);
        doc.text('Generated: ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC', W - margin - 60, 20);
        doc.text('Classification: CONFIDENTIAL', W - margin - 60, 25);

        // Divider
        doc.setDrawColor(0, 217, 255);
        doc.setLineWidth(0.5);
        doc.line(margin, 32, W - margin, 32);

        y = 40;

        // Section: Fleet Overview
        doc.setTextColor(0, 255, 136);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('LIVE FLEET STATUS', margin, y);
        y += 8;

        var totals = (exposureData && exposureData.totals) || {};
        var rows = [
            ['Total Fleet Equity', '$' + formatNum(totals.equity || 0)],
            ['Total Fleet Balance', '$' + formatNum(totals.balance || 0)],
            ['Aggregate Floating P&L', '$' + formatNum(totals.floating_pl || 0)],
            ['Total Open Positions', String(totals.positions || 0)],
            ['EAs Online', String(totals.online_eas || 0)],
            ['Average Fleet Drawdown', (exposureData && exposureData.avg_drawdown ? exposureData.avg_drawdown.toFixed(2) : '0.00') + '%'],
            ['Report Timestamp', (exposureData && exposureData.generated_at) || new Date().toISOString()]
        ];

        doc.setFontSize(9);
        rows.forEach(function(row) {
            doc.setTextColor(139, 148, 168);
            doc.text(row[0], margin, y);
            doc.setTextColor(230, 237, 243);
            doc.setFont('helvetica', 'bold');
            doc.text(row[1], margin + 80, y);
            doc.setFont('helvetica', 'normal');
            y += 6;
        });

        y += 10;

        // Section: Aggregate Exposure by Symbol
        doc.setTextColor(0, 217, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AGGREGATE EXPOSURE BY ASSET', margin, y);
        y += 8;

        // Table header
        doc.setFontSize(8);
        doc.setTextColor(91, 101, 128);
        doc.text('SYMBOL', margin, y);
        doc.text('TOTAL LOTS', margin + 40, y);
        doc.text('POSITIONS', margin + 70, y);
        doc.text('THRESHOLD', margin + 100, y);
        doc.text('STATUS', margin + 130, y);
        y += 5;
        doc.setDrawColor(50, 60, 80);
        doc.line(margin, y, W - margin, y);
        y += 4;

        var exposure = (exposureData && exposureData.exposure) || {};
        Object.keys(exposure).forEach(function(sym) {
            var e = exposure[sym];
            doc.setTextColor(230, 237, 243);
            doc.setFontSize(9);
            doc.text(sym, margin, y);
            doc.text(String((e.lots || 0).toFixed(2)), margin + 40, y);
            doc.text(String(e.positions || 0), margin + 70, y);
            doc.text(String(e.threshold || '-'), margin + 100, y);
            if (e.breached) {
                doc.setTextColor(255, 68, 68);
                doc.text('⚠ BREACHED', margin + 130, y);
            } else {
                doc.setTextColor(0, 255, 136);
                doc.text('✓ OK', margin + 130, y);
            }
            y += 5;
        });

        if (Object.keys(exposure).length === 0) {
            doc.setTextColor(91, 101, 128);
            doc.text('No open exposure data available.', margin, y);
            y += 5;
        }

        y += 10;

        // Active Alerts
        var alerts = (exposureData && exposureData.alerts) || [];
        if (alerts.length > 0) {
            doc.setTextColor(255, 68, 68);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ACTIVE RISK ALERTS (' + alerts.length + ')', margin, y);
            y += 7;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            alerts.forEach(function(a) {
                doc.setTextColor(255, 107, 107);
                doc.text('• ' + a.symbol + ': ' + (a.lots || a.value || '').toString().slice(0, 10) + ' (limit: ' + a.threshold + ')', margin + 5, y);
                y += 5;
            });
        }

        // Footer Page 1
        doc.setTextColor(91, 101, 128);
        doc.setFontSize(7);
        doc.text('Falcon Quant — Confidential Enterprise Report | Page 1 of 3', margin, H - 10);

        // ═══ PAGE 2: 24-HOUR HISTORICAL LEDGER ═══
        doc.addPage();
        doc.setFillColor(13, 17, 23);
        doc.rect(0, 0, W, H, 'F');
        y = 20;

        doc.setTextColor(0, 217, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('24-HOUR HISTORICAL LEDGER', margin, y);
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(91, 101, 128);
        doc.text('Neural network adjustments, compliance cycles, and alert history', margin, y);
        y += 10;

        // Table header
        doc.setFontSize(7);
        doc.setTextColor(91, 101, 128);
        doc.text('TIMESTAMP', margin, y);
        doc.text('ACTION', margin + 35, y);
        doc.text('TARGET', margin + 85, y);
        doc.text('BY', margin + 130, y);
        y += 4;
        doc.setDrawColor(50, 60, 80);
        doc.line(margin, y, W - margin, y);
        y += 4;

        // Filter to last 24 hours
        var now = Date.now();
        var day = 24 * 60 * 60 * 1000;
        var recentEntries = (auditEntries || []).filter(function(e) {
            return e.ts && (now - new Date(e.ts).getTime()) < day;
        }).slice(0, 40); // Max 40 entries per page

        doc.setFontSize(7);
        recentEntries.forEach(function(entry) {
            if (y > H - 20) return; // Prevent overflow
            doc.setTextColor(91, 101, 128);
            doc.text((entry.ts || '').slice(11, 19), margin, y);
            doc.setTextColor(0, 217, 255);
            doc.text((entry.action || '').slice(0, 30), margin + 35, y);
            doc.setTextColor(200, 208, 223);
            doc.text((entry.target || '').slice(0, 25), margin + 85, y);
            doc.setTextColor(139, 148, 168);
            doc.text((entry.by || '').slice(0, 15), margin + 130, y);
            y += 4;
        });

        if (recentEntries.length === 0) {
            doc.setTextColor(91, 101, 128);
            doc.text('No events recorded in the last 24 hours.', margin, y);
        }

        // Footer Page 2
        doc.setTextColor(91, 101, 128);
        doc.setFontSize(7);
        doc.text('Falcon Quant — Confidential Enterprise Report | Page 2 of 3', margin, H - 10);

        // Disclaimer
        doc.setFontSize(6);
        doc.text('DISCLAIMER: This report is generated from live system data and is for internal use only. Past performance does not guarantee future results.', margin, H - 5);

        // ═══ PAGE 3: INSTITUTIONAL EXECUTION & BROKER SLIPPAGE AUDIT ═══
        doc.addPage();
        doc.setFillColor(13, 17, 23);
        doc.rect(0, 0, W, H, 'F');
        y = 20;

        doc.setTextColor(0, 217, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INSTITUTIONAL EXECUTION & BROKER SLIPPAGE AUDIT', margin, y);
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(91, 101, 128);
        doc.text('Microsecond-precision execution metrics from fleet OrderSend operations', margin, y);
        y += 10;

        // Execution metrics from EA states
        var execMetrics = [];
        if (exposureData && exposureData.exec_metrics) {
            execMetrics = exposureData.exec_metrics;
        }
        // Also try to extract from EA states
        if (exposureData && exposureData.eas) {
            Object.keys(exposureData.eas).forEach(function(tk) {
                var ea = exposureData.eas[tk];
                if (ea && ea.exec_log) execMetrics = execMetrics.concat(ea.exec_log);
            });
        }

        if (execMetrics.length > 0) {
            // Table header
            doc.setFontSize(7);
            doc.setTextColor(91, 101, 128);
            doc.text('TIME', margin, y);
            doc.text('SYMBOL', margin + 25, y);
            doc.text('DIR', margin + 50, y);
            doc.text('LATENCY', margin + 65, y);
            doc.text('SLIPPAGE', margin + 85, y);
            doc.text('TYPE', margin + 110, y);
            doc.text('BROKER', margin + 130, y);
            y += 4;
            doc.setDrawColor(50, 60, 80);
            doc.line(margin, y, W - margin, y);
            y += 4;

            execMetrics.slice(-30).forEach(function(m) {
                if (y > H - 25) return;
                var lat = Number(m.latency_ms) || 0;
                var slip = Number(m.slippage_pips) || 0;
                doc.setFontSize(7);
                doc.setTextColor(91, 101, 128);
                doc.text(m.ts ? new Date(m.ts * 1000).toISOString().slice(11, 19) : '--', margin, y);
                doc.setTextColor(230, 237, 243);
                doc.text(String(m.symbol || '').slice(0, 8), margin + 25, y);
                doc.text(String(m.direction || ''), margin + 50, y);
                // Color-code latency
                if (lat > 300) doc.setTextColor(255, 68, 68);
                else if (lat > 150) doc.setTextColor(255, 193, 7);
                else doc.setTextColor(0, 255, 136);
                doc.text(lat + 'ms', margin + 65, y);
                // Color-code slippage
                if (m.slippage_dir === 'positive') doc.setTextColor(0, 217, 255);
                else if (m.slippage_dir === 'negative') doc.setTextColor(255, 68, 68);
                else doc.setTextColor(139, 148, 168);
                doc.text(slip.toFixed(1) + ' pips', margin + 85, y);
                doc.text(String(m.slippage_dir || ''), margin + 110, y);
                doc.setTextColor(139, 148, 168);
                doc.text(String(m.broker || '').slice(0, 20), margin + 130, y);
                y += 4;
            });
        } else {
            doc.setTextColor(91, 101, 128);
            doc.text('No execution metrics available. EAs will populate this section once trades are placed.', margin, y);
        }

        // Footer Page 3
        doc.setTextColor(91, 101, 128);
        doc.setFontSize(7);
        doc.text('Falcon Quant — Confidential Enterprise Report | Page 3 of 3', margin, H - 10);

        // Save
        var filename = 'FalconQuant_Report_' + new Date().toISOString().slice(0, 10) + '.pdf';
        doc.save(filename);
        return filename;
    }

    function formatNum(n) {
        return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return { generate: generate };
})();
