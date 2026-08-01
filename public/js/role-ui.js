(function () {
  function pageName() {
    var name = window.location.pathname.split('/').pop() || 'admin_dashboard';
    return name.replace(/\.html$/i, '') || 'admin_dashboard';
  }

  function authUser() {
    if (window.ZHIAuth && typeof window.ZHIAuth.user === 'function') return window.ZHIAuth.user() || {};
    try { return JSON.parse(localStorage.getItem('authUser') || '{}'); } catch (_) { return {}; }
  }

  function roleFromPage(page) {
    if (page.indexOf('teacher') === 0 || ['upload_marks', 'upload_notes', 'mark_attendance', 'manage_assignments'].includes(page)) return 'teacher';
    if (page.indexOf('staff') === 0 || ['office_reports'].includes(page)) return 'staff';
    if (page.indexOf('hod') === 0 || ['academic_dashboard', 'attendance_overview', 'HODtimetable_setup', 'manage_syllabus', 'performance_reports', 'substitute_mgmt'].includes(page)) return 'hod';
    if (page.indexOf('accountant') === 0 || ['all_transactions', 'fee_collection', 'financial_reports', 'generate_payslips', 'manage_expenses', 'salarymanagement'].includes(page)) return 'accountant';
    if (['admin_dashboard', 'director_dashboard', 'SystemSettings', 'users_roles', 'AuditLogs'].includes(page)) return 'director';
    return (localStorage.getItem('userRole') || '').toLowerCase();
  }

  function currentRole() {
    var user = authUser();
    return String(user.role || localStorage.getItem('userRole') || roleFromPage(pageName()) || '').toLowerCase();
  }

  var sections = {
    teacher: [
      { href: 'teacher_dashboard.html', icon: 'bx-home-alt', label: 'Dashboard Home', match: ['teacher_dashboard'] },
      { section: 'Academics' },
      { href: 'teacher_timetable.html', icon: 'bx-calendar', label: 'My Timetable', match: ['teacher_timetable'] },
      { href: 'upload_notes.html', icon: 'bx-folder-plus', label: 'Upload Notes', match: ['upload_notes'] },
      { href: 'manage_assignments.html', icon: 'bx-task', label: 'Assignments', match: ['manage_assignments'] },
      { section: 'Classroom' },
      { href: 'mark_attendance.html', icon: 'bx-check-shield', label: 'Mark Attendance', match: ['mark_attendance'] },
      { href: 'upload_marks.html', icon: 'bx-bar-chart-alt-2', label: 'Upload Marks', match: ['upload_marks'] },
      { href: 'GlobalNotice.html', icon: 'bx-message-rounded', label: 'Global Notices', match: ['GlobalNotice'] },
      { section: 'Personal' },
      { href: 'teacher_profile.html', icon: 'bx-user-circle', label: 'My Profile & Settings', match: ['teacher_profile'] },
      { href: 'teacher_self_attendance.html', icon: 'bx-fingerprint', label: 'Self Attendance', match: ['teacher_self_attendance'] },
      { href: 'apply_leave.html', icon: 'bx-envelope', label: 'Apply Leave', match: ['apply_leave'] },
      { logout: true }
    ],
    hod: [
      { href: 'academic_dashboard.html', icon: 'bx-home-alt', label: 'Dashboard Home', match: ['academic_dashboard', 'hod_dashboard'] },
      { section: 'Academics' },
      { href: 'HODtimetable_setup.html', icon: 'bx-calendar-edit', label: 'Timetable Setup', match: ['HODtimetable_setup'] },
      { href: 'attendance_overview.html', icon: 'bx-check-square', label: 'Attendance Overview', match: ['attendance_overview'] },
      { href: 'course_subjects.html', icon: 'bx-book-open', label: 'Courses & Subjects', match: ['course_subjects'] },
      { href: 'manage_syllabus.html', icon: 'bx-book-content', label: 'Manage Syllabus', match: ['manage_syllabus'] },
      { href: 'performance_reports.html', icon: 'bx-bar-chart-alt-2', label: 'Performance Reports', match: ['performance_reports'] },
      { section: 'Staff & Notices' },
      { href: 'manage_notices.html', icon: 'bx-message-rounded-edit', label: 'Manage Notices', match: ['manage_notices'] },
      { href: 'substitute_mgmt.html', icon: 'bx-transfer-alt', label: 'Substitute Management', match: ['substitute_mgmt'] },
      { href: 'hodleave.html', icon: 'bx-envelope-open', label: 'Leave Approval', match: ['hodleave'] },
      { href: 'teacher_profile.html', icon: 'bx-user-circle', label: 'My Profile & Settings', match: ['teacher_profile'] },
      { logout: true }
    ],
    staff: [
      { href: 'staff_dashboard.html', icon: 'bx-home-alt', label: 'Dashboard Home', match: ['staff_dashboard'] },
      { section: 'Students & Admissions' },
      { href: 'admissionform.html', icon: 'bx-user-plus', label: 'New Admission', match: ['admissionform'] },
      { href: 'staffstudent.html', icon: 'bx-group', label: 'Student Records', match: ['staffstudent', 'students'] },
      { href: 'course_subjects.html', icon: 'bx-book-open', label: 'Courses & Subjects', match: ['course_subjects'] },
      { section: 'Office' },
      { href: 'staffDirectory.html', icon: 'bx-id-card', label: 'Staff Directory', match: ['staffDirectory'] },
      { href: 'staffnotice.html', icon: 'bx-message-rounded', label: 'Notices', match: ['staffnotice', 'GlobalNotice'] },
      { href: 'office_reports.html', icon: 'bx-file', label: 'Office Reports', match: ['office_reports'] },
      { href: 'apply_leave.html', icon: 'bx-envelope', label: 'Apply Leave', match: ['apply_leave'] },
      { href: 'teacher_profile.html', icon: 'bx-user-circle', label: 'My Profile & Settings', match: ['teacher_profile'] },
      { logout: true }
    ],
    accountant: [
      { href: 'accountant_dashboard.html', icon: 'bx-home-alt', label: 'Dashboard Home', match: ['accountant_dashboard'] },
      { href: 'fee_collection.html', icon: 'bx-receipt', label: 'Fee Collection', match: ['fee_collection'] },
      { href: 'all_transactions.html', icon: 'bx-transfer', label: 'Transactions', match: ['all_transactions'] },
      { href: 'manage_expenses.html', icon: 'bx-wallet', label: 'Expenses', match: ['manage_expenses'] },
      { href: 'salarymanagement.html', icon: 'bx-money', label: 'Salary Management', match: ['salarymanagement'] },
      { href: 'generate_payslips.html', icon: 'bx-file', label: 'Payslips', match: ['generate_payslips'] },
      { href: 'financial_reports.html', icon: 'bx-line-chart', label: 'Financial Reports', match: ['financial_reports'] },
      { href: 'teacher_profile.html', icon: 'bx-user-circle', label: 'My Profile & Settings', match: ['teacher_profile'] },
      { logout: true }
    ],
    director: [
      { href: 'admin_dashboard.html', icon: 'bx-home-alt', label: 'Dashboard Home', match: ['admin_dashboard', 'director_dashboard'] },
      { href: 'users_roles.html', icon: 'bx-group', label: 'Users & Roles', match: ['users_roles'] },
      { href: 'students.html', icon: 'bx-user', label: 'Students', match: ['students'] },
      { href: 'addstaff.html', icon: 'bx-user-plus', label: 'Add Staff', match: ['addstaff'] },
      { href: 'Finance.html', icon: 'bx-dollar', label: 'Finance', match: ['Finance'] },
      { href: 'Reports&Analytics.html', icon: 'bx-bar-chart-alt-2', label: 'Reports & Analytics', match: ['Reports&Analytics'] },
      { href: 'Exams&Results.html', icon: 'bx-file', label: 'Exams & Results', match: ['Exams&Results'] },
      { href: 'GlobalNotice.html', icon: 'bx-message-rounded', label: 'Global Notices', match: ['GlobalNotice'] },
      { href: 'SystemSettings.html', icon: 'bx-cog', label: 'System Settings', match: ['SystemSettings'] },
      { href: 'AuditLogs.html', icon: 'bx-revision', label: 'Audit Logs', match: ['AuditLogs'] },
      { logout: true }
    ]
  };

  function ensureBoxicons() {
    if (document.querySelector('link[href*="boxicons"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css';
    document.head.appendChild(link);
  }

  function itemHtml(item, activePage, asNav) {
    if (item.section) {
      if (asNav) return '<div class="nav-category">' + item.section + '</div>';
      return '<li class="nav-section" style="margin:15px 0 5px 20px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">' + item.section + '</li>';
    }
    if (item.logout) {
      if (asNav) return '<a href="#" class="nav-item logout-btn" data-logout="true"><i class="bx bx-log-out"></i> Logout</a>';
      return '<li class="logout-btn"><a href="#" data-logout="true"><i class="bx bx-log-out"></i> Logout</a></li>';
    }
    var isActive = (item.match || []).includes(activePage);
    if (asNav) return '<a href="' + item.href + '" class="nav-item ' + (isActive ? 'active' : '') + '"><i class="bx ' + item.icon + '"></i> ' + item.label + '</a>';
    return '<li class="' + (isActive ? 'active' : '') + '"><a href="' + item.href + '"><i class="bx ' + item.icon + '"></i> ' + item.label + '</a></li>';
  }

  function applyNav(role) {
    var menu = document.querySelector('.sidebar-menu, .nav-menu');
    if (!menu || !sections[role]) return;
    var asNav = menu.classList.contains('nav-menu');
    menu.innerHTML = sections[role].map(function (item) { return itemHtml(item, pageName(), asNav); }).join('');
    menu.querySelectorAll('[data-logout="true"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.ZHIAuth) return window.ZHIAuth.logout();
        localStorage.clear();
        window.location.href = '/index.html';
      });
    });
  }

  function initials(name) {
    return String(name || 'User').split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase() || 'U';
  }

  function avatar(name) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,Arial" font-size="42" font-weight="700" fill="#fff">' + initials(name) + '</text></svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function applyProfile(profile) {
    var name = profile.name || localStorage.getItem('userName') || authUser().name || 'User';
    var role = (profile.staffRole || profile.role || currentRole()).toString();
    var image = profile.profilePicUrl || authUser().profilePicUrl || localStorage.getItem('profilePicUrl') || avatar(name);

    document.querySelectorAll('.user-profile b, .topbar-profile h4, #adminName').forEach(function (el) { el.textContent = name; });
    document.querySelectorAll('.user-profile span, .topbar-profile p').forEach(function (el) { el.textContent = role.toUpperCase(); });
    document.querySelectorAll('.user-profile img, .topbar-profile img, #profileImage').forEach(function (img) {
      img.src = image;
      img.alt = name;
    });

    localStorage.setItem('userName', name);
    if (profile.profilePicUrl) localStorage.setItem('profilePicUrl', profile.profilePicUrl);
    var existing = authUser();
    localStorage.setItem('authUser', JSON.stringify(Object.assign({}, existing, { name: name, profilePicUrl: profile.profilePicUrl || existing.profilePicUrl || '' })));
  }

  function normalizeLogoElement(el) {
    if (!el) return;
    if (el.tagName === 'IMG') {
      el.dataset.setting = 'logo';
      el.alt = 'ZHI Logo';
      return;
    }
    var img = el.querySelector('img[data-setting="logo"]');
    if (!img) {
      el.innerHTML = '<img src="/zhi_logo.png" data-setting="logo" alt="ZHI Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;">';
    }
  }

  function applyBrand(settings) {
    settings = settings || window.ZHI_SETTINGS || {};
    var logo = settings.logoUrl || '/zhi_logo.png';
    document.querySelectorAll('.logo-img,.logo-box,.brand-logo').forEach(normalizeLogoElement);
    document.querySelectorAll('img[data-setting="logo"], img[alt*="ZHI Logo"]').forEach(function (img) { img.src = logo; });
    document.querySelectorAll('.sidebar-header h2,.sidebar-header h4,[data-setting="collegeShortName"]').forEach(function (el) {
      if (settings.collegeShortName || settings.collegeName) el.textContent = settings.collegeShortName || settings.collegeName;
    });
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) { return res.ok ? res.json() : null; }).catch(function () { return null; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureBoxicons();
    var role = currentRole();
    applyNav(role);
    applyBrand(window.ZHI_SETTINGS || null);
    applyProfile({ name: authUser().name || localStorage.getItem('userName'), role: role, profilePicUrl: authUser().profilePicUrl || '' });

    fetchJson('/api/settings/public').then(function (payload) {
      if (payload && payload.success) applyBrand(payload.data);
    });

    if (document.querySelector('.sidebar')) {
      fetchJson('/api/profile/me').then(function (payload) {
        if (payload && payload.success) applyProfile(payload.data);
      });
    }
  });

  window.ZHIRoleUI = { applyProfile: applyProfile, applyBrand: applyBrand, applyNav: applyNav };
})();
