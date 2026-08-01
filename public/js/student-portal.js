/**
 * ZHI Student Portal — shared client script.
 *  - Injects sidebar + topbar
 *  - Provides `apiGet`, `apiPost`, `apiPut`, `apiUpload`
 *  - All API calls go through /api/student/... which is JWT-scoped on the
 *    server, so the client never has to send an ID.
 */
(function () {
  const ZS = {
    apiBase: '/api',
    async request(path, opts = {}) {
      const res = await fetch(this.apiBase + path, {
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        credentials: 'same-origin',
        ...opts
      });
      let body = null;
      try { body = await res.json(); } catch (_) { body = {}; }
      if (!res.ok || body.success === false) {
        throw new Error((body && body.message) || res.statusText || 'Request failed');
      }
      return body;
    },
    apiGet(path) { return this.request(path, { method: 'GET' }); },
    apiPost(path, data) {
      return this.request(path, { method: 'POST', body: JSON.stringify(data || {}) });
    },
    apiPut(path, data) {
      return this.request(path, { method: 'PUT', body: JSON.stringify(data || {}) });
    },
    async apiUpload(path, formData) {
      const res = await fetch(this.apiBase + path, {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });
      let body = null;
      try { body = await res.json(); } catch (_) { body = {}; }
      if (!res.ok || body.success === false) {
        throw new Error((body && body.message) || 'Upload failed');
      }
      return body;
    },
    toast(msg, type = 'info') {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = `
        position:fixed;top:80px;right:24px;z-index:9999;
        padding:12px 18px;border-radius:8px;font-size:14px;font-weight:600;
        box-shadow:0 8px 24px rgba(0,0,0,.15);color:#fff;
        background:${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        opacity:0;transform:translateY(-8px);transition:.25s;
      `;
      document.body.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
    },
    fmtMoney(n) { return '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    fmtDate(v) { if (!v) return '—'; try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (_) { return String(v); } }
  };

  window.ZS = ZS;

  // Sidebar template (a single source of truth so every page stays in sync)
  const SIDEBAR_HTML = ({ active, name, avatar }) => `
    <aside class="sidebar" id="zsSidebar">
      <div class="sidebar-header">
        <img src="/zhi_logo.png" alt="ZHI" onerror="this.style.display='none'">
        <div>
          <h2>Student Portal</h2>
          <p>Zakir Husain Institute</p>
        </div>
      </div>
      <ul class="sidebar-menu">
        ${[
          { key: 'dashboard',  href: '/students_dashboard',  icon: 'bx-grid-alt',      label: 'Dashboard' },
          { key: 'profile',    href: '/student_profile',     icon: 'bxs-user',         label: 'My Profile' },
          { key: 'attendance', href: '/student_attendance',  icon: 'bx-calendar-check',label: 'Attendance' },
          { key: 'timetable',  href: '/student_timetable',   icon: 'bx-time-five',     label: 'Timetable' },
          { key: 'assignments',href: '/student_assignments', icon: 'bxs-book-content', label: 'Assignments & Notes' },
          { key: 'results',    href: '/student_results',     icon: 'bx-award',         label: 'Exam Results' },
          { key: 'fees',       href: '/student_fees',        icon: 'bx-money',         label: 'Fees' },
          { key: 'leave',      href: '/student_leave',       icon: 'bx-mail-send',     label: 'Leave Request' }
        ].map(m => `
          <li class="${m.key === active ? 'active' : ''}">
            <a href="${m.href}"><i class='bx ${m.icon}'></i>${m.label}</a>
          </li>
        `).join('')}
      </ul>
      <div class="sidebar-footer">
        Signed in as<br><b style="color:#fff">${name || 'Student'}</b>
        <button id="zsLogout" style="margin-top:10px;">
          <i class='bx bx-log-out'></i> Logout
        </button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="zsOverlay"></div>
  `;

  const TOPBAR_HTML = ({ pageTitle, name, avatar, subtitle }) => `
    <header class="topbar">
      <button class="menu-btn" id="zsMenuBtn"><i class='bx bx-menu'></i></button>
      <div class="page-heading">${pageTitle || 'Dashboard'}</div>
      <div class="user-profile">
        <div class="user-profile-text" style="text-align:right;">
          <b>${name || 'Student'}</b>
          <span>${subtitle || 'Student'}</span>
        </div>
        <img src="${avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'Student') + '&background=3b82f6&color=fff'}"
             onerror="this.src='https://ui-avatars.com/api/?name=S&background=3b82f6&color=fff'" alt="me">
      </div>
    </header>
  `;

  ZS.mount = async function ({ active, pageTitle }) {
    const localUser = (() => {
      try { return JSON.parse(localStorage.getItem('authUser') || 'null'); } catch (_) { return null; }
    })();
    let user = localUser;
    try {
      const me = await ZS.apiGet('/auth/me');
      user = me.user || user;
    } catch (_) { /* auth-client will already redirect on 401 */ }

    const name = (user && user.name) || 'Student';
    const avatar = (user && user.profilePicUrl) || '';
    const subtitle = user && user.role ? user.role.toUpperCase() : 'STUDENT';

    document.body.insertAdjacentHTML('afterbegin', SIDEBAR_HTML({ active, name, avatar }));
    const mainWrapper = document.getElementById('zsMain');
    if (mainWrapper) {
      mainWrapper.insertAdjacentHTML('afterbegin', TOPBAR_HTML({ pageTitle, name, avatar, subtitle }));
    }

    document.getElementById('zsMenuBtn')?.addEventListener('click', () => {
      document.getElementById('zsSidebar').classList.toggle('open');
      document.getElementById('zsOverlay').classList.toggle('show');
    });
    document.getElementById('zsOverlay')?.addEventListener('click', () => {
      document.getElementById('zsSidebar').classList.remove('open');
      document.getElementById('zsOverlay').classList.remove('show');
    });
    document.getElementById('zsLogout')?.addEventListener('click', async () => {
      if (window.ZHIAuth) await window.ZHIAuth.logout(); else window.location.href = '/index.html';
    });

    return user;
  };
})();
