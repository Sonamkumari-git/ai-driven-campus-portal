/**
 * ai-client.js
 * -------------
 * Vanilla JS helpers to call the Node.js AI proxy routes (`/api/ai/*`).
 * Include on any dashboard page:
 *   <script src="/js/ai-client.js" defer></script>
 *
 * Then use e.g. window.ZhiAI.predictPerformance({ ... }).
 * Every function returns a Promise resolving to `{ success, data }`
 * or `{ success:false, error }`.
 */
(function (global) {
  'use strict';

  const BASE = '/api/ai';

  async function _postJSON(path, body) {
    try {
      const res = await fetch(BASE + path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        return { success: false, error: json.error || `HTTP ${res.status}` };
      }
      return { success: true, data: json.data };
    } catch (err) {
      console.error('[ZhiAI]', path, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  async function _postForm(path, formData) {
    try {
      const res = await fetch(BASE + path, {
        method: 'POST',
        credentials: 'include',
        body: formData,          // do NOT set Content-Type; browser sets boundary
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        return { success: false, error: json.error || `HTTP ${res.status}` };
      }
      return { success: true, data: json.data };
    } catch (err) {
      console.error('[ZhiAI]', path, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  async function health() {
    try {
      const res = await fetch(BASE + '/health', { credentials: 'include' });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ---- 1) Performance ----
  function predictPerformance(payload) {
    return _postJSON('/performance', payload);
  }

  // ---- 2) At-Risk ----
  function predictAtRisk(payload) {
    return _postJSON('/at-risk', payload);
  }

  // ---- 3) Attendance risk ----
  function attendanceRisk(payload) {
    return _postJSON('/attendance-risk', payload);
  }

  // ---- 4) Finance anomaly ----
  function financeAnomaly(payload) {
    return _postJSON('/finance-anomaly', payload);
  }

  // ---- 5) Document OCR ----
  function uploadDocument(file) {
    const fd = new FormData();
    fd.append('file', file);
    return _postForm('/document', fd);
  }

  // ------------------------------------------------------------------ //
  // Small render helpers for dashboards
  // ------------------------------------------------------------------ //

  function renderInto(elId, htmlOrText) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = htmlOrText;
  }

  function _riskBadge(level) {
    const colors = { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626',
                     SAFE: '#16a34a', AT_RISK: '#d97706', CRITICAL: '#dc2626',
                     IMPOSSIBLE: '#7f1d1d' };
    const c = colors[level] || '#374151';
    return `<span style="background:${c};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px">${level}</span>`;
  }

  /** Renders a performance card into container element id. */
  async function showPerformance(elId, payload) {
    renderInto(elId, '<em>Predicting…</em>');
    const r = await predictPerformance(payload);
    if (!r.success) return renderInto(elId, `<span style="color:#dc2626">Error: ${r.error}</span>`);
    const d = r.data;
    renderInto(elId, `
      <div class="ai-card">
        <div><strong>Predicted score:</strong> ${d.predicted_final_score}%</div>
        <div><strong>Grade:</strong> ${d.predicted_grade}</div>
        <div><strong>Risk:</strong> ${_riskBadge(d.risk_category)}</div>
      </div>`);
  }

  async function showAtRisk(elId, payload) {
    renderInto(elId, '<em>Analysing…</em>');
    const r = await predictAtRisk(payload);
    if (!r.success) return renderInto(elId, `<span style="color:#dc2626">Error: ${r.error}</span>`);
    const d = r.data;
    renderInto(elId, `
      <div class="ai-card">
        <div><strong>Dropout probability:</strong> ${(d.dropout_probability * 100).toFixed(1)}%</div>
        <div><strong>Level:</strong> ${_riskBadge(d.risk_level)}</div>
        <div><strong>Top factors:</strong>
          <ul>${d.top_factors.map(f => `<li>${f}</li>`).join('')}</ul>
        </div>
      </div>`);
  }

  async function showAttendance(elId, payload) {
    renderInto(elId, '<em>Calculating…</em>');
    const r = await attendanceRisk(payload);
    if (!r.success) return renderInto(elId, `<span style="color:#dc2626">Error: ${r.error}</span>`);
    const d = r.data;
    renderInto(elId, `
      <div class="ai-card">
        <div><strong>Current:</strong> ${d.current_pct}%</div>
        <div><strong>Status:</strong> ${_riskBadge(d.status)}</div>
        <div><strong>Classes needed:</strong> ${d.classes_needed_to_reach_threshold}</div>
        <div><strong>Can miss up to:</strong> ${d.max_classes_can_miss}</div>
        <div style="margin-top:6px;color:#374151"><em>${d.recommendation}</em></div>
      </div>`);
  }

  async function showFinanceAnomalies(elId, payload) {
    renderInto(elId, '<em>Scanning transactions…</em>');
    const r = await financeAnomaly(payload);
    if (!r.success) return renderInto(elId, `<span style="color:#dc2626">Error: ${r.error}</span>`);
    const d = r.data;
    const rows = (d.items || [])
      .filter(i => i.is_anomaly)
      .slice(0, 20)
      .map(i => `<tr>
        <td>${i.tx_id || '-'}</td>
        <td>₹${i.amount.toLocaleString()}</td>
        <td>${i.anomaly_score.toFixed(3)}</td>
      </tr>`).join('');
    renderInto(elId, `
      <div class="ai-card">
        <div><strong>Checked:</strong> ${d.total_checked} &nbsp; <strong>Anomalies:</strong> ${d.anomalies_found}</div>
        ${rows ? `<table style="width:100%;margin-top:8px;border-collapse:collapse">
          <thead><tr><th align="left">Txn ID</th><th align="left">Amount</th><th align="left">Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : '<p style="color:#16a34a">No anomalies detected.</p>'}
      </div>`);
  }

  async function showDocumentUpload(elId, fileInputEl) {
    const file = fileInputEl?.files?.[0];
    if (!file) return renderInto(elId, '<span style="color:#dc2626">Please choose a file first.</span>');
    renderInto(elId, '<em>Running OCR…</em>');
    const r = await uploadDocument(file);
    if (!r.success) return renderInto(elId, `<span style="color:#dc2626">Error: ${r.error}</span>`);
    const d = r.data;
    const rows = Object.entries(d.extracted || {})
      .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`).join('');
    renderInto(elId, `
      <div class="ai-card">
        <div><strong>Detected type:</strong> ${d.doc_type_guess}</div>
        <table style="width:100%;margin-top:8px;border-collapse:collapse">${rows}</table>
        <details style="margin-top:8px"><summary>Raw text</summary>
          <pre style="white-space:pre-wrap;font-size:12px">${d.raw_text}</pre>
        </details>
      </div>`);
  }

  // ------------------------------------------------------------------ //
  // Public namespace
  // ------------------------------------------------------------------ //
  global.ZhiAI = {
    health,
    predictPerformance,
    predictAtRisk,
    attendanceRisk,
    financeAnomaly,
    uploadDocument,
    // renderers
    showPerformance,
    showAtRisk,
    showAttendance,
    showFinanceAnomalies,
    showDocumentUpload,
  };
})(window);
