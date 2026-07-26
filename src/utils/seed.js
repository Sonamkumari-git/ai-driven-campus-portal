const User = require('../models/User');
const Settings = require('../models/Settings');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');
const Notice = require('../models/Notice');
const Routine = require('../models/Routine');
const TeacherAttendance = require('../models/TeacherAttendance');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Leave = require('../models/Leave');
const AuditLog = require('../models/AuditLog');
const { env } = require('../config/env');
const { generateFeeStructure, applyPaymentToHeads } = require('./finance');
const { hashPassword } = require('./password');

const upsertOptions = { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true };

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(offsetDays = 0) {
  return isoDate(offsetDays).toISOString().slice(0, 10);
}

function monthVal(offsetDays = 0) {
  return dateStr(offsetDays).slice(0, 7);
}

function dayName(offsetDays = 0) {
  return isoDate(offsetDays).toLocaleDateString('en-US', { weekday: 'long' });
}

async function upsertStaff(filter, payload) {
  if (payload.password) payload.password = hashPassword(payload.password);
  return Staff.findOneAndUpdate(filter, { $set: payload }, upsertOptions);
}

async function upsertStudent(filter, payload) {
  if (payload.password) payload.password = hashPassword(payload.password);
  return Student.findOneAndUpdate(filter, { $set: payload }, upsertOptions);
}

async function seedDefaultDirector() {
  const admin = await User.findOneAndUpdate(
    { email: env.admin.email, role: 'director' },
    { $setOnInsert: { role: 'director', email: env.admin.email, name: 'Director', password: hashPassword(env.admin.password), profilePicUrl: '' } },
    upsertOptions
  );
  return admin;
}

async function seedSettings() {
  await Settings.ensureDefault();
  return Settings.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        collegeName: 'Zakir Husain Institute of Higher Education',
        collegeShortName: 'ZHI College',
        portalSubtitle: 'Admin, Faculty & Student Portal',
        activeSession: '2025 - 2026',
        contactEmail: 'admin@zhi.edu.in',
        supportEmail: 'support@zhi.edu.in',
        logoUrl: '/zhi_logo.png',
        timezone: 'Asia/Kolkata',
        currencySymbol: '₹',
        dateFormat: 'DD-MM-YYYY',
        maintenanceMode: false
      }
    },
    upsertOptions
  );
}

async function seedStaff() {
  const hod = await upsertStaff(
    { empId: 'ZHI-HOD-001' },
    {
      category: 'management',
      role: 'HOD - Computer Applications',
      empId: 'ZHI-HOD-001',
      password: 'hod123',
      name: 'Dr. Priya Sharma',
      fatherName: 'Ramesh Sharma',
      dob: '1984-02-12',
      gender: 'Female',
      mobile: '9876500001',
      email: 'hod@zhi.edu.in',
      address: 'Academic Block, ZHI Campus',
      qualification: 'Ph.D Computer Science',
      university: 'Patna University',
      experience: '14 Years',
      skills: 'Academic Planning, DBMS, Software Engineering, Mentoring',
      joinDate: '2016-07-01',
      dept: 'Computer Applications',
      shift: 'Morning',
      salary: 82000,
      status: 'Active',
      bankName: 'State Bank of India',
      accNumber: '111122223333',
      ifsc: 'SBIN0001234'
    }
  );

  const accountant = await upsertStaff(
    { empId: 'ZHI-ACC-001' },
    {
      category: 'management',
      role: 'Accountant',
      empId: 'ZHI-ACC-001',
      password: 'account123',
      name: 'Rohit Verma',
      fatherName: 'Mahesh Verma',
      dob: '1990-08-19',
      gender: 'Male',
      mobile: '9876500002',
      email: 'accountant@zhi.edu.in',
      address: 'Accounts Office, ZHI Campus',
      qualification: 'M.Com',
      university: 'Magadh University',
      experience: '9 Years',
      skills: 'Fee Collection, Payroll, Tally, Financial Reporting',
      joinDate: '2018-04-10',
      dept: 'Accounts',
      shift: 'General',
      salary: 48000,
      status: 'Active',
      bankName: 'HDFC Bank',
      accNumber: '222233334444',
      ifsc: 'HDFC0001234'
    }
  );

  const officeStaff = await upsertStaff(
    { empId: 'ZHI-STF-001' },
    {
      category: 'management',
      role: 'Office Staff',
      empId: 'ZHI-STF-001',
      password: 'staff123',
      name: 'Karan Mishra',
      fatherName: 'Suresh Mishra',
      dob: '1993-11-05',
      gender: 'Male',
      mobile: '9876500003',
      email: 'staff@zhi.edu.in',
      address: 'Admin Office, ZHI Campus',
      qualification: 'BBA',
      university: 'Aryabhatta Knowledge University',
      experience: '6 Years',
      skills: 'Admissions, Student Records, Office Reports, Notice Board',
      joinDate: '2020-01-15',
      dept: 'Administration',
      shift: 'General',
      salary: 36000,
      status: 'Active',
      bankName: 'ICICI Bank',
      accNumber: '333344445555',
      ifsc: 'ICIC0001234'
    }
  );

  const teacher1 = await upsertStaff(
    { empId: 'ZHI-TCH-001' },
    {
      category: 'teacher',
      role: 'Assistant Professor',
      empId: 'ZHI-TCH-001',
      password: 'teacher123',
      name: 'Amit Kumar',
      fatherName: 'Dinesh Kumar',
      dob: '1988-06-21',
      gender: 'Male',
      mobile: '9876500004',
      email: 'teacher@zhi.edu.in',
      address: 'Faculty Room 2, ZHI Campus',
      qualification: 'MCA, UGC-NET',
      university: 'NIT Patna',
      experience: '10 Years',
      skills: 'C Programming, DBMS, Web Development, Operating System',
      joinDate: '2019-07-01',
      dept: 'Computer Applications',
      shift: 'Morning',
      salary: 56000,
      status: 'Active',
      bankName: 'Axis Bank',
      accNumber: '444455556666',
      ifsc: 'UTIB0001234'
    }
  );

  const teacher2 = await upsertStaff(
    { empId: 'ZHI-TCH-002' },
    {
      category: 'teacher',
      role: 'Faculty - Management Studies',
      empId: 'ZHI-TCH-002',
      password: 'teacher234',
      name: 'Neha Singh',
      fatherName: 'Rajiv Singh',
      dob: '1991-03-18',
      gender: 'Female',
      mobile: '9876500005',
      email: 'neha.teacher@zhi.edu.in',
      address: 'Faculty Room 4, ZHI Campus',
      qualification: 'MBA Finance',
      university: 'Delhi University',
      experience: '7 Years',
      skills: 'Business Communication, Financial Accounting, Economics',
      joinDate: '2021-08-05',
      dept: 'Management Studies',
      shift: 'Morning',
      salary: 52000,
      status: 'Active',
      bankName: 'Punjab National Bank',
      accNumber: '555566667777',
      ifsc: 'PUNB0001234'
    }
  );

  return { hod, accountant, officeStaff, teacher1, teacher2 };
}

async function seedStudents() {
  const studentsPayload = [
    ['ZHI2025001', 'Aman Raj', 'aman.raj@student.zhi.edu.in', 'BCA', 'Semester 1', '2025-2028', '9876510001', 'Male', 35000],
    ['ZHI2025002', 'Priya Kumari', 'priya.kumari@student.zhi.edu.in', 'BCA', 'Semester 1', '2025-2028', '9876510002', 'Female', 50000],
    ['ZHI2025003', 'Rahul Kumar', 'rahul.kumar@student.zhi.edu.in', 'BCA', 'Semester 1', '2025-2028', '9876510003', 'Male', 25000],
    ['ZHI2025004', 'Sneha Gupta', 'sneha.gupta@student.zhi.edu.in', 'BBA', 'Semester 1', '2025-2028', '9876510004', 'Female', 42000],
    ['ZHI2025005', 'Imran Khan', 'imran.khan@student.zhi.edu.in', 'MCA', 'Semester 1', '2025-2027', '9876510005', 'Male', 60000]
  ];

  const students = [];
  for (const [collegeRegNo, studentName, email, course, semester, sessionBatch, mobile, gender, amountCollected] of studentsPayload) {
    const student = await upsertStudent(
      { collegeRegNo },
      {
        course,
        semester,
        sessionBatch,
        registrationDate: dateStr(-20),
        collegeRegNo,
        univRegNo: `UNIV-${collegeRegNo}`,
        studentName,
        dob: '2005-05-12',
        gender,
        bloodGroup: gender === 'Female' ? 'B+' : 'O+',
        nationality: 'Indian',
        motherTongue: 'Hindi',
        studentMobile: mobile,
        email,
        aadharNumber: `99998888${collegeRegNo.slice(-4)}`,
        category: 'General',
        religion: 'N/A',
        permanentAddress: 'Patna, Bihar',
        city: 'Patna',
        state: 'Bihar',
        pincode: '800001',
        district: 'Patna',
        tempAddress: 'ZHI Hostel, Patna',
        fatherName: `${studentName.split(' ')[0]} Father`,
        fatherMobile: `987652${collegeRegNo.slice(-4)}`,
        motherName: `${studentName.split(' ')[0]} Mother`,
        motherMobile: `987653${collegeRegNo.slice(-4)}`,
        guardianName: `${studentName.split(' ')[0]} Guardian`,
        guardianRelation: 'Parent',
        guardianMobile: `987654${collegeRegNo.slice(-4)}`,
        guardianAddress: 'Patna, Bihar',
        amountCollected,
        paymentMode: 'Cash',
        transactionId: `ADM-${collegeRegNo}`,
        password: mobile,
        status: 'Active'
      }
    );
    students.push(student);
  }
  return students;
}

async function seedFees(students) {
  for (const student of students) {
    const existing = await StudentFee.findOne({ studentId: student._id });
    if (!existing) {
      const feeRecord = new StudentFee({ studentId: student._id, ...generateFeeStructure(student.course) });
      const paid = Number(student.amountCollected || 0);
      if (paid > 0) applyPaymentToHeads(feeRecord, paid, null);
      await feeRecord.save();
    }

    await Transaction.findOneAndUpdate(
      { receiptNo: `SEED-${student.collegeRegNo}` },
      {
        $setOnInsert: {
          receiptNo: `SEED-${student.collegeRegNo}`,
          studentId: student._id,
          date: isoDate(-18),
          mode: student.paymentMode || 'Cash',
          amount: Number(student.amountCollected || 0),
          feeHeadName: 'Admission Fee (Seed Payment)',
          remarks: 'Seed admission payment',
          payerMobile: student.studentMobile
        }
      },
      upsertOptions
    );
  }
}

async function seedFinanceExpenses() {
  const expenses = [
    ['SEED-VCH-001', 'Electricity', 12500, 'Monthly electricity bill'],
    ['SEED-VCH-002', 'Internet', 3500, 'Campus broadband bill'],
    ['SEED-VCH-003', 'Salary Advance', 18000, 'Faculty salary advance'],
    ['SEED-VCH-004', 'Stationery', 4200, 'Office stationery and registers']
  ];
  for (const [voucherNo, category, amount, description] of expenses) {
    await Expense.findOneAndUpdate(
      { voucherNo },
      { $setOnInsert: { voucherNo, category, amount, description, mode: 'Cash', date: isoDate(-7) } },
      upsertOptions
    );
  }
}

async function seedNotices() {
  const notices = [
    ['Welcome to Academic Session 2025-26', 'All students and faculty are informed that the new academic session has started. Timetable is available on portal.', 'success', ['All'], 'Director Office'],
    ['Fee Payment Reminder', 'Students with pending dues are requested to clear their installments before the due date.', 'warning', ['Students', 'Accountant'], 'Accounts Office'],
    ['Faculty Meeting', 'All teachers must attend the academic review meeting in Seminar Hall at 02:00 PM.', 'info', ['Teacher', 'HOD'], 'HOD Office'],
    ['Holiday Notice', 'College will remain closed on the upcoming public holiday as per university notification.', 'info', ['All'], 'Admin Office']
  ];
  for (const [title, message, priority, audience, postedBy] of notices) {
    await Notice.findOneAndUpdate(
      { title },
      { $set: { title, message, priority, audience, postedBy } },
      upsertOptions
    );
  }
}

async function seedRoutines(staff) {
  const routines = [
    ['BCA', 'Semester 1', 'A', 'C Programming', staff.teacher1, 0, '09:30', '10:30', 'Lab 1'],
    ['BCA', 'Semester 1', 'A', 'DBMS', staff.teacher1, 1, '10:30', '11:30', 'Room 101'],
    ['BCA', 'Semester 1', 'A', 'Web Development', staff.teacher1, 2, '11:30', '12:30', 'Lab 2'],
    ['BBA', 'Semester 1', 'A', 'Financial Accounting', staff.teacher2, 0, '10:30', '11:30', 'Room 204'],
    ['BBA', 'Semester 1', 'A', 'Business Communication', staff.teacher2, 1, '11:30', '12:30', 'Room 204']
  ];

  for (const [course, semester, section, subject, teacher, offset, startTime, endTime, roomNumber] of routines) {
    await Routine.findOneAndUpdate(
      { course, semester, section, subject, teacherId: teacher._id, dayOfWeek: dayName(offset) },
      {
        $set: {
          course,
          semester,
          section,
          subject,
          teacherId: teacher._id,
          teacherName: teacher.name,
          date: dateStr(offset),
          dayOfWeek: dayName(offset),
          startTime,
          endTime,
          roomNumber
        }
      },
      upsertOptions
    );
  }
}

async function seedTeacherAttendance(staff) {
  const logs = [
    [staff.teacher1, 0, '09:12 AM', '04:05 PM', 'Present', 'On Time'],
    [staff.teacher1, -1, '09:25 AM', '04:00 PM', 'Present', 'On Time'],
    [staff.teacher2, 0, '09:18 AM', '04:10 PM', 'Present', 'On Time'],
    [staff.hod, 0, '09:05 AM', '05:00 PM', 'Present', 'Academic review']
  ];

  for (const [teacher, offset, punchIn, punchOut, status, remarks] of logs) {
    await TeacherAttendance.findOneAndUpdate(
      { teacherId: teacher._id, dateStr: dateStr(offset) },
      {
        $set: {
          teacherId: teacher._id,
          teacherName: teacher.name,
          dateStr: dateStr(offset),
          monthVal: monthVal(offset),
          dayName: dayName(offset),
          punchIn,
          punchOut,
          status,
          remarks
        }
      },
      upsertOptions
    );
  }
}

async function seedStudentAttendance(students, staff) {
  const bcaStudents = students.filter(s => s.course === 'BCA');
  const records = bcaStudents.map((student, index) => ({
    studentId: student._id,
    rollNumber: student.collegeRegNo,
    studentName: student.studentName,
    status: index === 2 ? 'A' : 'P'
  }));
  const presentCount = records.filter(r => r.status === 'P').length;
  const absentCount = records.length - presentCount;
  const fullDate = isoDate(0);

  await Attendance.findOneAndUpdate(
    { fullDate, course: 'BCA', semester: 'Semester 1', subject: 'C Programming' },
    {
      $set: {
        fullDate,
        day: fullDate.getDate(),
        month: String(fullDate.getMonth() + 1).padStart(2, '0'),
        year: fullDate.getFullYear(),
        batch: '2025-2028',
        course: 'BCA',
        semester: 'Semester 1',
        section: 'A',
        subject: 'C Programming',
        startTime: '09:30',
        endTime: '10:30',
        teacherId: staff.teacher1._id,
        records,
        summary: {
          totalStudents: records.length,
          presentCount,
          absentCount,
          attendancePercentage: records.length ? Math.round((presentCount / records.length) * 10000) / 100 : 0
        }
      }
    },
    upsertOptions
  );
}

async function seedMarks(students, staff) {
  const bcaStudents = students.filter(s => s.course === 'BCA');
  const marks = bcaStudents.map((student, index) => ({
    studentId: student._id,
    rollNo: student.collegeRegNo,
    studentName: student.studentName,
    attendanceStatus: 'Present',
    marksObtained: [82, 91, 67][index] || 75,
    rank: index + 1,
    remarks: index === 1 ? 'Excellent' : 'Good'
  })).sort((a, b) => b.marksObtained - a.marksObtained).map((row, index) => ({ ...row, rank: index + 1 }));

  await Mark.findOneAndUpdate(
    { course: 'BCA', sessionBatch: '2025-2028', semester: 'Semester 1', subject: 'C Programming', examName: 'First Mid-Term' },
    {
      $set: {
        teacherId: staff.teacher1._id,
        course: 'BCA',
        sessionBatch: '2025-2028',
        semester: 'Semester 1',
        subject: 'C Programming',
        examName: 'First Mid-Term',
        examDate: isoDate(-3),
        maxMarks: 100,
        studentsMarkList: marks,
        status: 'Published'
      }
    },
    upsertOptions
  );
}

async function seedLeaves(students, staff) {
  const leaves = [
    {
      applicantId: staff.teacher1._id.toString(),
      applicantName: staff.teacher1.name,
      applicantRole: 'Teacher',
      leaveType: 'Casual Leave',
      startDate: dateStr(2),
      endDate: dateStr(2),
      totalDays: 1,
      reason: 'Family function',
      status: 'Pending',
      hodRemark: ''
    },
    {
      applicantId: students[0]._id.toString(),
      applicantName: students[0].studentName,
      applicantRole: 'Student',
      course: students[0].course,
      semester: students[0].semester,
      leaveType: 'Sick Leave',
      startDate: dateStr(-1),
      endDate: dateStr(0),
      totalDays: 2,
      reason: 'Fever and doctor advised rest',
      status: 'Approved',
      hodRemark: 'Approved. Submit medical slip later.'
    }
  ];

  for (const leave of leaves) {
    await Leave.findOneAndUpdate(
      { applicantId: leave.applicantId, startDate: leave.startDate, leaveType: leave.leaveType },
      { $set: leave },
      upsertOptions
    );
  }
}

async function seedAuditLogs() {
  const logs = [
    ['System seed completed', 'System', 'Seed', 'SUCCESS'],
    ['Demo students synced', 'Admin Desk', 'Student', 'SUCCESS'],
    ['Demo fee ledgers prepared', 'Accounts', 'Finance', 'SUCCESS'],
    ['Demo timetable prepared', 'HOD Office', 'Academics', 'SUCCESS']
  ];
  for (const [action, actor, module, status] of logs) {
    await AuditLog.findOneAndUpdate(
      { action, actor, module },
      { $set: { action, actor, module, status, ip: 'seed', meta: { seeded: true } } },
      upsertOptions
    );
  }
}

async function seedAdmin() {
  try {
    await seedDefaultDirector();
    await seedSettings();
    const staff = await seedStaff();
    const students = await seedStudents();
    await seedFees(students);
    await seedFinanceExpenses();
    await seedNotices();
    await seedRoutines(staff);
    await seedTeacherAttendance(staff);
    await seedStudentAttendance(students, staff);
    await seedMarks(students, staff);
    await seedLeaves(students, staff);
    await seedAuditLogs();
    console.log('Seed data ready: director, HOD, accountant, staff, teachers, students, fees, attendance, marks, notices and leaves.');
  } catch (error) {
    console.warn('Seed skipped:', error.message);
  }
}

module.exports = { seedAdmin };
