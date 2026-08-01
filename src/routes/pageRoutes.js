const express = require('express');
const path = require('path');
const { env } = require('../config/env');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const pages = [
  { name: 'admin_dashboard', file: 'admin_dashboard.html', roles: ['director'] },
  { name: 'users_roles', file: 'users_roles.html', roles: ['director'] },
  { name: 'students', file: 'students.html', roles: ['director', 'hod', 'staff'] },
  { name: 'admissionform', file: 'admissionform.html', roles: ['director', 'staff'] },
  { name: 'addstaff', file: 'addstaff.html', roles: ['director'] },
  { name: 'Finance', file: 'Finance.html', roles: ['director', 'accountant'] },
  { name: 'Reports&Analytics', file: 'Reports&Analytics.html', roles: ['director', 'hod'] },
  { name: 'Exams&Results', file: 'Exams&Results.html', roles: ['director', 'hod', 'teacher'] },
  { name: 'GlobalNotice', file: 'GlobalNotice.html', roles: ['director', 'hod', 'staff', 'teacher', 'accountant'] },
  { name: 'SystemSettings', file: 'SystemSettings.html', roles: ['director'] },
  { name: 'AuditLogs', file: 'AuditLogs.html', roles: ['director'] },

  { name: 'academic_dashboard', file: 'academic_dashboard.html', roles: ['hod'] },
  { name: 'hod_dashboard', file: 'academic_dashboard.html', roles: ['hod'] },
  { name: 'HODtimetable_setup', file: 'HODtimetable_setup.html', roles: ['hod'] },
  { name: 'hodleave', file: 'hodleave.html', roles: ['hod'] },
  { name: 'attendance_overview', file: 'attendance_overview.html', roles: ['hod'] },
  { name: 'course_subjects', file: 'course_subjects.html', roles: ['hod', 'staff'] },
  { name: 'manage_notices', file: 'manage_notices.html', roles: ['hod'] },
  { name: 'manage_syllabus', file: 'manage_syllabus.html', roles: ['hod'] },
  { name: 'performance_reports', file: 'performance_reports.html', roles: ['hod'] },
  { name: 'substitute_mgmt', file: 'substitute_mgmt.html', roles: ['hod'] },

  { name: 'accountant_dashboard', file: 'accountant_dashboard.html', roles: ['accountant'] },
  { name: 'all_transactions', file: 'all_transactions.html', roles: ['accountant', 'director'] },
  { name: 'fee_collection', file: 'fee_collection.html', roles: ['accountant', 'director'] },
  { name: 'financial_reports', file: 'financial_reports.html', roles: ['accountant', 'director'] },
  { name: 'generate_payslips', file: 'generate_payslips.html', roles: ['accountant', 'director'] },
  { name: 'manage_expenses', file: 'manage_expenses.html', roles: ['accountant', 'director'] },
  { name: 'salarymanagement', file: 'salarymanagement.html', roles: ['accountant', 'director'] },

  { name: 'staff_dashboard', file: 'staff_dashboard.html', roles: ['staff'] },
  { name: 'director_dashboard', file: 'admin_dashboard.html', roles: ['director'] },
  { name: 'staffDirectory', file: 'staffDirectory.html', roles: ['staff', 'director'] },
  { name: 'staffstudent', file: 'staffstudent.html', roles: ['staff', 'director'] },
  { name: 'staffnotice', file: 'staffnotice.html', roles: ['staff', 'director'] },
  { name: 'office_reports', file: 'office_reports.html', roles: ['staff', 'director'] },

  { name: 'teacher_dashboard', file: 'teacher_dashboard.html', roles: ['teacher'] },
  { name: 'teacher_profile', file: 'teacher_profile.html', roles: ['teacher', 'staff', 'hod', 'accountant', 'director'] },
  { name: 'staff_profile', file: 'teacher_profile.html', roles: ['staff'] },
  { name: 'hod_profile', file: 'teacher_profile.html', roles: ['hod'] },
  { name: 'accountant_profile', file: 'teacher_profile.html', roles: ['accountant'] },
  { name: 'director_profile', file: 'teacher_profile.html', roles: ['director'] },
  { name: 'teacher_self_attendance', file: 'teacher_self_attendance.html', roles: ['teacher'] },
  { name: 'teacher_timetable', file: 'teacher_timetable.html', roles: ['teacher'] },
  { name: 'upload_marks', file: 'upload_marks.html', roles: ['teacher'] },
  { name: 'upload_notes', file: 'upload_notes.html', roles: ['teacher'] },
  { name: 'apply_leave', file: 'apply_leave.html', roles: ['teacher', 'staff', 'hod'] },
  { name: 'mark_attendance', file: 'mark_attendance.html', roles: ['teacher'] },
  { name: 'manage_assignments', file: 'manage_assignments.html', roles: ['teacher'] },

  // ----- STUDENT MODULE -----
  { name: 'students_dashboard', file: 'students_dashboard.html', roles: ['student'] },
  { name: 'student_profile',    file: 'student_profile.html',    roles: ['student'] },
  { name: 'student_attendance', file: 'student_attendance.html', roles: ['student'] },
  { name: 'student_timetable',  file: 'student_timetable.html',  roles: ['student'] },
  { name: 'student_assignments',file: 'student_assignments.html',roles: ['student'] },
  { name: 'student_results',    file: 'student_results.html',    roles: ['student'] },
  { name: 'student_fees',       file: 'student_fees.html',       roles: ['student'] },
  { name: 'student_leave',      file: 'student_leave.html',      roles: ['student'] }
];

function sendPage(file) {
  return (req, res) => res.sendFile(path.join(env.publicDir, file));
}

for (const page of pages) {
  router.get(`/${page.name}`, requireAuth(page.roles), sendPage(page.file));
  router.get(`/${page.file}`, requireAuth(page.roles), sendPage(page.file));
}

module.exports = router;
