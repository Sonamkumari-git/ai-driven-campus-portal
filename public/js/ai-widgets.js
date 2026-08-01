/* ============================================================================
 *  ai-widgets.js — thin frontend glue for the /api/ai/* bridge routes
 *  Vanilla JS, no framework, matches the existing ZHI CSS design system.
 *
 *  Each `initXxx()` function is a no-op if its target DOM element is missing,
 *  so the same script can be loaded on every dashboard without breaking layout.
 * ==========================================================================*/
(function () {
  'use strict';

  const AI = {
    async predictRisk()   { return fetch('/api/ai/predict-risk',       { credentials: 'include' }).then(r => r.json()); },
    async predictRiskOne(studentId) { return fetch('/api/ai/predict-risk', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }) }).then(r => r.json()); },
    async timetable()     { return fetch('/api/ai/generate-timetable', { credentials: 'include' }).then(r => r.json()); },
    async forecast(months=6){ return fetch('/api/ai/financial-forecast?horizon=' + months, { credentials: 'include' }).then(r => r.json()); },
    async verifyFace(id)  { return fetch('/api/ai/verify-face', { method: 'POST', credentials: 'include', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ studentId: id }) }).then(r => r.json()); }
  };
  window.ZHI_AI = AI;

  function badge(band) {
    const map = {
      HIGH:   { bg: '#fee2e2', color: '#991b1b', label: 'HIGH' },
      MEDIUM: { bg: '#ffedd5', color: '#9a3412', label: 'MED' },
      LOW:    { bg: '#dcfce7', color: '#166534', label: 'LOW' }
    };
    const cfg = map[band] || map.LOW;
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:${cfg.bg};color:${cfg.color};font-size:10px;font-weight:700;letter-spacing:0.5px;">${cfg.label}</span>`;
  }
  window.ZHI_AI_BADGE = badge;

  // -------------------------------------------------------------------- //
  //  Admin / Director dashboard — Financial Forecast + Risk Alert
  // -------------------------------------------------------------------- //
  async function initAdminAiWidgets() {
    const chartCanvas = document.getElementById('aiForecastChart');
    const riskList    = document.getElementById('aiTopRiskList');
    if (!chartCanvas && !riskList) return;

    if (chartCanvas && window.Chart) {
      try {
        const data = await AI.forecast(6);
        const labels = (data.revenue || []).map(x => x.month);
        const rev = (data.revenue || []).map(x => x.value);
        const exp = (data.expense || []).map(x => x.value);
        document.getElementById('aiForecastModelTag').innerText = 'model: ' + (data.model || 'ai');
        new Chart(chartCanvas, {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'Revenue', data: rev, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: true },
              { label: 'Expense', data: exp, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',  tension: 0.3, fill: true }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: { y: { ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } }
          }
        });
      } catch (e) { console.warn('AI forecast failed', e); }
    }

    if (riskList) {
      try {
        const data = await AI.predictRisk();
        document.getElementById('aiHighRiskCount').innerText = data.highRisk;
        document.getElementById('aiMedRiskCount').innerText  = data.mediumRisk;
        document.getElementById('aiLowRiskCount').innerText  = data.lowRisk;
        const sum = document.getElementById('aiRiskSummary');
        if (sum) sum.innerText = 'Model: ' + (data.model || 'ai') + ' • ' + data.total + ' students scored';

        const top = (data.rows || []).slice(0, 5);
        riskList.innerHTML = top.map(r => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid #f1f5f9;">
            <div>
              <div style="font-weight:600;color:#0f172a;">${r.studentName}</div>
              <div style="font-size:11px;color:#64748b;">${r.collegeRegNo} • ${r.course} • Attend ${r.attendancePct}% • Avg ${r.avgMarks}</div>
            </div>
            <div>${badge(r.riskBand)}</div>
          </div>`).join('') || '<div style="color:#64748b;">No students found.</div>';
      } catch (e) {
        riskList.innerHTML = '<div style="color:#ef4444;">Failed to load AI risk data.</div>';
      }
    }
  }

  // -------------------------------------------------------------------- //
  //  Finance page — chart + fee-default matrix (shared, DOM-driven)
  // -------------------------------------------------------------------- //
  async function initFinanceAiWidgets() {
    const chartCanvas = document.getElementById('aiFinanceForecastChart');
    const matrixBody  = document.getElementById('aiFeeDefaultMatrixBody');
    if (chartCanvas && window.Chart) {
      try {
        const data = await AI.forecast(6);
        const labels = (data.revenue || []).map(x => x.month);
        new Chart(chartCanvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Revenue', data: data.revenue.map(x => x.value), backgroundColor: '#10b981' },
              { label: 'Expense', data: data.expense.map(x => x.value), backgroundColor: '#ef4444' },
              { label: 'Net',     data: data.netProfit.map(x => x.value), type: 'line', borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', tension: 0.3 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
        });
      } catch (e) { console.warn('AI finance forecast failed', e); }
    }
    if (matrixBody) {
      try {
        const data = await AI.predictRisk();
        matrixBody.innerHTML = (data.rows || []).map(r => `
          <tr>
            <td>${r.collegeRegNo}</td>
            <td>${r.studentName}</td>
            <td>${r.course}</td>
            <td>${r.feeDelayDays} d</td>
            <td>${r.attendancePct}%</td>
            <td>${(r.dropoutProbability*100).toFixed(1)}%</td>
            <td>${badge(r.riskBand)}</td>
          </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:15px;">No data</td></tr>';
      } catch (e) {
        matrixBody.innerHTML = '<tr><td colspan="7" style="color:#ef4444;text-align:center;padding:15px;">AI service unavailable.</td></tr>';
      }
    }
  }

  // -------------------------------------------------------------------- //
  //  HOD / Academic dashboard — risk badges + timetable optimiser button
  // -------------------------------------------------------------------- //
  async function initHodAiWidgets() {
    const optimiseBtn = document.getElementById('aiTimetableOptimizeBtn');
    const outputBox   = document.getElementById('aiTimetableOutput');
    if (optimiseBtn) {
      optimiseBtn.addEventListener('click', async () => {
        optimiseBtn.disabled = true;
        optimiseBtn.innerText = 'Optimising…';
        try {
          const data = await AI.timetable();
          if (outputBox) {
            outputBox.innerHTML = `
              <div style="padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:10px;font-size:12px;">
                <strong>Conflicts:</strong> ${data.conflictsBefore} → ${data.conflictsAfter}
                • <strong>χ(G):</strong> ${data.chromaticNumber}
                • <strong>Fitness:</strong> ${data.fitness}
                • <strong>Model:</strong> ${data.model}
              </div>
              <div style="max-height:280px;overflow:auto;">
                <table style="width:100%;font-size:12px;border-collapse:collapse;">
                  <thead><tr style="background:#f8fafc;">
                    <th style="text-align:left;padding:6px;">Course</th>
                    <th style="text-align:left;padding:6px;">Subject</th>
                    <th style="text-align:left;padding:6px;">Teacher</th>
                    <th style="text-align:left;padding:6px;">Day</th>
                    <th style="text-align:left;padding:6px;">Time</th>
                    <th style="text-align:left;padding:6px;">Room</th>
                  </tr></thead>
                  <tbody>${(data.optimisedSchedule||[]).map(s => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:6px;">${s.course}</td>
                      <td style="padding:6px;">${s.subject}</td>
                      <td style="padding:6px;">${s.teacherName||''}</td>
                      <td style="padding:6px;">${s.dayOfWeek}</td>
                      <td style="padding:6px;">${s.startTime}-${s.endTime}</td>
                      <td style="padding:6px;">${s.assignedRoom}</td>
                    </tr>`).join('')}</tbody>
                </table>
              </div>`;
          }
        } catch (e) {
          if (outputBox) outputBox.innerHTML = '<div style="color:#ef4444;padding:10px;">AI optimiser failed. Check console.</div>';
        } finally {
          optimiseBtn.disabled = false;
          optimiseBtn.innerHTML = '<i class="bx bx-brain"></i> AI Timetable Optimizer';
        }
      });
    }

    // Populate risk badges into the students table (if present)
    await paintRiskBadges();
  }

  async function paintRiskBadges() {
    const container = document.querySelector('[data-ai-risk-target]') || document.getElementById('studentsTableBody') || document.querySelector('table tbody');
    if (!container) return;
    try {
      const data = await AI.predictRisk();
      const map = {};
      for (const r of data.rows || []) {
        map[r.collegeRegNo] = r;
        map[String(r.studentId)] = r;
      }
      const rows = container.querySelectorAll('tr[data-reg-no], tr[data-student-id]');
      rows.forEach(tr => {
        const key = tr.getAttribute('data-reg-no') || tr.getAttribute('data-student-id');
        const row = map[key];
        if (!row) return;
        const cell = tr.querySelector('[data-ai-risk-cell]');
        if (cell) cell.innerHTML = badge(row.riskBand);
      });
    } catch (e) { console.warn('risk badge paint failed', e); }
  }

  // -------------------------------------------------------------------- //
  //  Teacher — Face verification toggle on mark attendance
  // -------------------------------------------------------------------- //
  function initTeacherAiWidgets() {
    const toggle = document.getElementById('aiFaceToggle');
    const status = document.getElementById('aiFaceStatus');
    if (!toggle) return;
    toggle.addEventListener('change', () => {
      const on = toggle.checked;
      if (status) {
        status.innerHTML = on
          ? '<span style="color:#10b981;font-weight:600;"><i class="bx bx-check-shield"></i> Face Verification ACTIVE (AI)</span>'
          : '<span style="color:#64748b;">Face Verification Off — using manual mode</span>';
      }
      window.ZHI_FACE_VERIFY_ENABLED = on;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAdminAiWidgets();
    initFinanceAiWidgets();
    initHodAiWidgets();
    initTeacherAiWidgets();
  });
})();
