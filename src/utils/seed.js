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

  const teacher3 = await upsertStaff(
    { empId: 'ZHI-TCH-003' },
    {
      category: 'teacher',
      role: 'Faculty - Mathematics',
      empId: 'ZHI-TCH-003',
      password: 'teacher345',
      name: 'Dr. Sanjay Tiwari',
      fatherName: 'Ram Tiwari',
      dob: '1982-09-11',
      gender: 'Male',
      mobile: '9876500006',
      email: 'sanjay.teacher@zhi.edu.in',
      address: 'Faculty Room 5, ZHI Campus',
      qualification: 'Ph.D Mathematics',
      university: 'IIT Kanpur',
      experience: '12 Years',
      skills: 'Discrete Maths, Linear Algebra, Probability, Statistics',
      joinDate: '2017-08-15',
      dept: 'Computer Applications',
      shift: 'Morning',
      salary: 64000,
      status: 'Active',
      bankName: 'Bank of Baroda',
      accNumber: '666677778888',
      ifsc: 'BARB0001234'
    }
  );

  const teacher4 = await upsertStaff(
    { empId: 'ZHI-TCH-004' },
    {
      category: 'teacher',
      role: 'Faculty - English Communication',
      empId: 'ZHI-TCH-004',
      password: 'teacher456',
      name: 'Anjali Verma',
      fatherName: 'Prakash Verma',
      dob: '1989-12-25',
      gender: 'Female',
      mobile: '9876500007',
      email: 'anjali.teacher@zhi.edu.in',
      address: 'Faculty Room 3, ZHI Campus',
      qualification: 'M.A. English',
      university: 'JNU Delhi',
      experience: '8 Years',
      skills: 'English Communication, Soft Skills, Aptitude',
      joinDate: '2020-07-01',
      dept: 'Humanities',
      shift: 'Morning',
      salary: 50000,
      status: 'Active',
      bankName: 'Canara Bank',
      accNumber: '777788889999',
      ifsc: 'CNRB0001234'
    }
  );

  return { hod, accountant, officeStaff, teacher1, teacher2, teacher3, teacher4 };
}

/**
 * RICH STUDENT PROFILES ENGINEERED FOR AI TRAINING
 * riskProfile:
 *   'HIGH'   -> Attendance < 60%, delayed fees, low marks   (dropout / fail-risk positive class)
 *   'MEDIUM' -> Attendance 60-80%, partial fees, average marks
 *   'LOW'    -> Attendance > 85%, on-time fees, good marks
 */
const STUDENT_PROFILES = [
  { reg: 'ZHI2025001', name: 'Aman Raj',        email: 'aman.raj@student.zhi.edu.in',        course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510001', gender: 'Male',   feePaid: 35000, riskProfile: 'MEDIUM' },
  { reg: 'ZHI2025002', name: 'Priya Kumari',    email: 'priya.kumari@student.zhi.edu.in',    course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510002', gender: 'Female', feePaid: 50000, riskProfile: 'LOW'    },
  { reg: 'ZHI2025003', name: 'Rahul Kumar',     email: 'rahul.kumar@student.zhi.edu.in',     course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510003', gender: 'Male',   feePaid: 12000, riskProfile: 'HIGH'   },
  { reg: 'ZHI2025004', name: 'Sneha Gupta',     email: 'sneha.gupta@student.zhi.edu.in',     course: 'BBA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510004', gender: 'Female', feePaid: 42000, riskProfile: 'LOW'    },
  { reg: 'ZHI2025005', name: 'Imran Khan',      email: 'imran.khan@student.zhi.edu.in',      course: 'MCA',  sem: 'Semester 1', batch: '2025-2027', mob: '9876510005', gender: 'Male',   feePaid: 60000, riskProfile: 'LOW'    },
  { reg: 'ZHI2025006', name: 'Nisha Yadav',     email: 'nisha.yadav@student.zhi.edu.in',     course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510006', gender: 'Female', feePaid: 8000,  riskProfile: 'HIGH'   },
  { reg: 'ZHI2025007', name: 'Vikash Singh',    email: 'vikash.singh@student.zhi.edu.in',    course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510007', gender: 'Male',   feePaid: 25000, riskProfile: 'MEDIUM' },
  { reg: 'ZHI2025008', name: 'Ritika Sinha',    email: 'ritika.sinha@student.zhi.edu.in',    course: 'BBA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510008', gender: 'Female', feePaid: 48000, riskProfile: 'LOW'    },
  { reg: 'ZHI2025009', name: 'Manoj Paswan',    email: 'manoj.paswan@student.zhi.edu.in',    course: 'BBA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510009', gender: 'Male',   feePaid: 15000, riskProfile: 'HIGH'   },
  { reg: 'ZHI2025010', name: 'Kavita Ranjan',   email: 'kavita.ranjan@student.zhi.edu.in',   course: 'MCA',  sem: 'Semester 1', batch: '2025-2027', mob: '9876510010', gender: 'Female', feePaid: 55000, riskProfile: 'LOW'    },
  { reg: 'ZHI2025011', name: 'Shivam Anand',    email: 'shivam.anand@student.zhi.edu.in',    course: 'MCA',  sem: 'Semester 1', batch: '2025-2027', mob: '9876510011', gender: 'Male',   feePaid: 20000, riskProfile: 'MEDIUM' },
  { reg: 'ZHI2025012', name: 'Pooja Rani',      email: 'pooja.rani@student.zhi.edu.in',      course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510012', gender: 'Female', feePaid: 45000, riskProfile: 'LOW'    },
  { reg: 'ZHI2025013', name: 'Deepak Chaudhary',email: 'deepak.chaudhary@student.zhi.edu.in',course: 'BCA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510013', gender: 'Male',   feePaid: 5000,  riskProfile: 'HIGH'   },
  { reg: 'ZHI2025014', name: 'Rekha Kumari',    email: 'rekha.kumari@student.zhi.edu.in',    course: 'BBA',  sem: 'Semester 1', batch: '2025-2028', mob: '9876510014', gender: 'Female', feePaid: 30000, riskProfile: 'MEDIUM' },
  { reg: 'ZHI2025015', name: 'Ajay Prasad',     email: 'ajay.prasad@student.zhi.edu.in',     course: 'MCA',  sem: 'Semester 1', batch: '2025-2027', mob: '9876510015', gender: 'Male',   feePaid: 58000, riskProfile: 'LOW'    }
];

async function seedStudents() {
  const students = [];
  for (const p of STUDENT_PROFILES) {
    const student = await upsertStudent(
      { collegeRegNo: p.reg },
      {
        course: p.course,
        semester: p.sem,
        sessionBatch: p.batch,
        registrationDate: dateStr(-45),
        collegeRegNo: p.reg,
        univRegNo: `UNIV-${p.reg}`,
        studentName: p.name,
        dob: '2005-05-12',
        gender: p.gender,
        bloodGroup: p.gender === 'Female' ? 'B+' : 'O+',
        nationality: 'Indian',
        motherTongue: 'Hindi',
        studentMobile: p.mob,
        email: p.email,
        aadharNumber: `99998888${p.reg.slice(-4)}`,
        category: 'General',
        religion: 'N/A',
        permanentAddress: 'Patna, Bihar',
        city: 'Patna',
        state: 'Bihar',
        pincode: '800001',
        district: 'Patna',
        tempAddress: 'ZHI Hostel, Patna',
        fatherName: `${p.name.split(' ')[0]} Father`,
        fatherMobile: `987652${p.reg.slice(-4)}`,
        motherName: `${p.name.split(' ')[0]} Mother`,
        motherMobile: `987653${p.reg.slice(-4)}`,
        guardianName: `${p.name.split(' ')[0]} Guardian`,
        guardianRelation: 'Parent',
        guardianMobile: `987654${p.reg.slice(-4)}`,
        guardianAddress: 'Patna, Bihar',
        amountCollected: p.feePaid,
        paymentMode: 'Cash',
        transactionId: `ADM-${p.reg}`,
        password: p.mob,
        status: 'Active',
        // AI-facing meta fields (harmless — mongoose won't strip unknown fields with default schema options
        // used across the codebase; the AI service reads them via aggregation, not the Schema itself)
        riskProfile: p.riskProfile
      }
    );
    // Attach the risk profile for downstream seeders (in-memory only, not persisted here)
    student._risk = p.riskProfile;
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

    // Two seed transactions per student for a richer ledger.
    // HIGH-risk students get a delayed (30-45 days overdue) partial payment
    // LOW/MEDIUM get an on-time payment.
    const risk = student._risk || 'MEDIUM';
    const primaryOffset = risk === 'HIGH' ? -45 : -18;
    const primaryAmount = Number(student.amountCollected || 0);

    await Transaction.findOneAndUpdate(
      { receiptNo: `SEED-${student.collegeRegNo}` },
      {
        $setOnInsert: {
          receiptNo: `SEED-${student.collegeRegNo}`,
          studentId: student._id,
          date: isoDate(primaryOffset),
          mode: student.paymentMode || 'Cash',
          amount: primaryAmount,
          feeHeadName: risk === 'HIGH' ? 'Admission Fee (Partial / Delayed)' : 'Admission Fee (Seed Payment)',
          remarks: risk === 'HIGH' ? 'Delayed / partial payment - flagged by accounts' : 'Seed admission payment',
          payerMobile: student.studentMobile
        }
      },
      upsertOptions
    );

    // Low-risk students also seed an installment payment 5 days back
    if (risk === 'LOW') {
      await Transaction.findOneAndUpdate(
        { receiptNo: `SEED-INS-${student.collegeRegNo}` },
        {
          $setOnInsert: {
            receiptNo: `SEED-INS-${student.collegeRegNo}`,
            studentId: student._id,
            date: isoDate(-5),
            mode: 'UPI',
            amount: 5000,
            feeHeadName: 'Tuition Installment',
            remarks: 'On-time installment payment',
            payerMobile: student.studentMobile
          }
        },
        upsertOptions
      );
    }
  }
}

async function seedFinanceExpenses() {
  // Extended expense ledger for time-series financial forecasting model
  const expenses = [
    ['SEED-VCH-001', 'Electricity',    12500, 'Monthly electricity bill',        -7],
    ['SEED-VCH-002', 'Internet',        3500, 'Campus broadband bill',           -10],
    ['SEED-VCH-003', 'Salary Advance', 18000, 'Faculty salary advance',          -15],
    ['SEED-VCH-004', 'Stationery',      4200, 'Office stationery and registers', -12],
    ['SEED-VCH-005', 'Electricity',    13100, 'Previous month electricity',      -37],
    ['SEED-VCH-006', 'Maintenance',     6800, 'AC servicing and plumbing',       -25],
    ['SEED-VCH-007', 'Lab Equipment',  22000, 'Computer lab hardware upgrade',   -55],
    ['SEED-VCH-008', 'Library Books',   9800, 'New reference books',             -70],
    ['SEED-VCH-009', 'Salary Advance', 17500, 'Prev month faculty advance',      -45],
    ['SEED-VCH-010', 'Water',           2400, 'Municipal water charges',         -30]
  ];
  for (const [voucherNo, category, amount, description, offset] of expenses) {
    await Expense.findOneAndUpdate(
      { voucherNo },
      { $setOnInsert: { voucherNo, category, amount, description, mode: 'Cash', date: isoDate(offset) } },
      upsertOptions
    );
  }
}

async function seedNotices() {
  const notices = [
    ['Welcome to Academic Session 2025-26', 'All students and faculty are informed that the new academic session has started. Timetable is available on portal.', 'success', ['All'], 'Director Office'],
    ['Fee Payment Reminder', 'Students with pending dues are requested to clear their installments before the due date.', 'warning', ['Students', 'Accountant'], 'Accounts Office'],
    ['Faculty Meeting', 'All teachers must attend the academic review meeting in Seminar Hall at 02:00 PM.', 'info', ['Teacher', 'HOD'], 'HOD Office'],
    ['Holiday Notice', 'College will remain closed on the upcoming public holiday as per university notification.', 'info', ['All'], 'Admin Office'],
    ['AI-Powered Attendance Rollout', 'From next month, attendance may be captured via AI Face Verification. Kindly cooperate with faculty for enrollment photos.', 'info', ['All'], 'IT Cell']
  ];
  for (const [title, message, priority, audience, postedBy] of notices) {
    await Notice.findOneAndUpdate(
      { title },
      { $set: { title, message, priority, audience, postedBy } },
      upsertOptions
    );
  }
}

/**
 * TIMETABLE seeding — deliberately introduces overlapping slots + room clashes
 * so the AI timetable optimizer (Graph Coloring / CSP) has a non-trivial input.
 *
 * Conflict examples built in:
 *  - teacher1 double-booked Monday 10:30-11:30 (Room 101 vs Lab 2)
 *  - Room 204 shared between BBA and BCA at Tuesday 11:30-12:30
 */
async function seedRoutines(staff) {
  const routines = [
    // BCA Semester 1 - Section A
    ['BCA', 'Semester 1', 'A', 'C Programming',       staff.teacher1, 0, '09:30', '10:30', 'Lab 1'],
    ['BCA', 'Semester 1', 'A', 'DBMS',                staff.teacher1, 1, '10:30', '11:30', 'Room 101'],
    ['BCA', 'Semester 1', 'A', 'Web Development',     staff.teacher1, 1, '10:30', '11:30', 'Lab 2'],   // CONFLICT: teacher1 double-booked
    ['BCA', 'Semester 1', 'A', 'Discrete Maths',      staff.teacher3, 2, '09:30', '10:30', 'Room 102'],
    ['BCA', 'Semester 1', 'A', 'English Comm.',       staff.teacher4, 2, '11:30', '12:30', 'Room 204'], // CONFLICT: Room 204 clash with BBA below

    // BBA Semester 1 - Section A
    ['BBA', 'Semester 1', 'A', 'Financial Accounting', staff.teacher2, 0, '10:30', '11:30', 'Room 204'],
    ['BBA', 'Semester 1', 'A', 'Business Communication', staff.teacher2, 1, '11:30', '12:30', 'Room 204'],
    ['BBA', 'Semester 1', 'A', 'Business Maths',      staff.teacher3, 2, '11:30', '12:30', 'Room 204'], // CONFLICT: Room 204
    ['BBA', 'Semester 1', 'A', 'English Comm.',       staff.teacher4, 3, '10:30', '11:30', 'Room 205'],

    // MCA Semester 1 - Section A
    ['MCA', 'Semester 1', 'A', 'Advanced DBMS',       staff.teacher1, 3, '11:30', '12:30', 'Lab 1'],
    ['MCA', 'Semester 1', 'A', 'Statistics',          staff.teacher3, 4, '09:30', '10:30', 'Room 301'],
    ['MCA', 'Semester 1', 'A', 'Software Engineering',staff.teacher1, 4, '09:30', '10:30', 'Room 302']  // CONFLICT: teacher1 double-booked with above? No (different day), but slot overlap example
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
  const teachers = [staff.teacher1, staff.teacher2, staff.teacher3, staff.teacher4, staff.hod];
  const punchInPool = ['09:05 AM', '09:12 AM', '09:18 AM', '09:25 AM', '09:32 AM'];
  const punchOutPool = ['04:00 PM', '04:05 PM', '04:10 PM', '04:30 PM', '05:00 PM'];

  for (const teacher of teachers) {
    for (let offset = 0; offset >= -6; offset--) {
      // Skip weekends for realism
      const wd = isoDate(offset).getDay();
      if (wd === 0) continue; // Sunday off
      const punchIn = punchInPool[Math.abs(offset) % punchInPool.length];
      const punchOut = punchOutPool[Math.abs(offset) % punchOutPool.length];
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
            status: 'Present',
            remarks: 'On Time'
          }
        },
        upsertOptions
      );
    }
  }
}

/**
 * Multi-day, multi-subject attendance history — engineered to expose the
 * high-risk / low-risk cohort clearly to the XGBoost / MLP dropout predictor.
 *
 * HIGH-risk students -> absent ~50% of the time
 * MEDIUM-risk        -> absent ~25% of the time
 * LOW-risk           -> absent ~5% of the time
 */
async function seedStudentAttendance(students, staff) {
  const bcaStudents = students.filter(s => s.course === 'BCA');
  const bbaStudents = students.filter(s => s.course === 'BBA');
  const mcaStudents = students.filter(s => s.course === 'MCA');

  const schedule = [
    { course: 'BCA', students: bcaStudents, teacher: staff.teacher1, subject: 'C Programming',       startTime: '09:30', endTime: '10:30' },
    { course: 'BCA', students: bcaStudents, teacher: staff.teacher1, subject: 'DBMS',                startTime: '10:30', endTime: '11:30' },
    { course: 'BCA', students: bcaStudents, teacher: staff.teacher3, subject: 'Discrete Maths',      startTime: '09:30', endTime: '10:30' },
    { course: 'BBA', students: bbaStudents, teacher: staff.teacher2, subject: 'Financial Accounting',startTime: '10:30', endTime: '11:30' },
    { course: 'BBA', students: bbaStudents, teacher: staff.teacher2, subject: 'Business Communication', startTime: '11:30', endTime: '12:30' },
    { course: 'MCA', students: mcaStudents, teacher: staff.teacher1, subject: 'Advanced DBMS',       startTime: '11:30', endTime: '12:30' },
    { course: 'MCA', students: mcaStudents, teacher: staff.teacher3, subject: 'Statistics',          startTime: '09:30', endTime: '10:30' }
  ];

  const absentProb = { HIGH: 0.55, MEDIUM: 0.25, LOW: 0.05 };

  // 10 school days of history
  const dayOffsets = [-1, -2, -3, -6, -7, -8, -9, -10, -13, -14];

  for (const offset of dayOffsets) {
    const wd = isoDate(offset).getDay();
    if (wd === 0) continue; // skip Sunday

    for (const slot of schedule) {
      if (!slot.students.length) continue;

      const records = slot.students.map((student, idx) => {
        const risk = student._risk || 'MEDIUM';
        // Deterministic pseudo-randomness so seed is idempotent per (student, subject, day)
        const seedVal = (student.collegeRegNo.charCodeAt(6) + Math.abs(offset) * 7 + idx * 3) % 100;
        const threshold = absentProb[risk] * 100;
        const status = seedVal < threshold ? 'A' : 'P';
        return {
          studentId: student._id,
          rollNumber: student.collegeRegNo,
          studentName: student.studentName,
          status
        };
      });

      const presentCount = records.filter(r => r.status === 'P').length;
      const absentCount = records.length - presentCount;
      const fullDate = isoDate(offset);

      await Attendance.findOneAndUpdate(
        { fullDate, course: slot.course, semester: 'Semester 1', subject: slot.subject },
        {
          $set: {
            fullDate,
            day: fullDate.getDate(),
            month: String(fullDate.getMonth() + 1).padStart(2, '0'),
            year: fullDate.getFullYear(),
            batch: slot.course === 'MCA' ? '2025-2027' : '2025-2028',
            course: slot.course,
            semester: 'Semester 1',
            section: 'A',
            subject: slot.subject,
            startTime: slot.startTime,
            endTime: slot.endTime,
            teacherId: slot.teacher._id,
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
  }
}

/**
 * Marks distribution engineered by risk cohort:
 *   HIGH   -> 30-45  (fail risk)
 *   MEDIUM -> 55-68  (average)
 *   LOW    -> 80-95  (top performers)
 */
async function seedMarks(students, staff) {
  const markByRisk = { HIGH: [32, 38, 41, 45], MEDIUM: [55, 60, 65, 68], LOW: [82, 88, 91, 95] };

  const examConfigs = [
    { course: 'BCA', teacher: staff.teacher1, subject: 'C Programming',        exam: 'First Mid-Term'  },
    { course: 'BCA', teacher: staff.teacher1, subject: 'DBMS',                 exam: 'First Mid-Term'  },
    { course: 'BCA', teacher: staff.teacher3, subject: 'Discrete Maths',       exam: 'First Mid-Term'  },
    { course: 'BBA', teacher: staff.teacher2, subject: 'Financial Accounting', exam: 'First Mid-Term'  },
    { course: 'BBA', teacher: staff.teacher2, subject: 'Business Communication', exam: 'First Mid-Term' },
    { course: 'MCA', teacher: staff.teacher1, subject: 'Advanced DBMS',        exam: 'First Mid-Term'  },
    { course: 'MCA', teacher: staff.teacher3, subject: 'Statistics',           exam: 'First Mid-Term'  }
  ];

  for (const cfg of examConfigs) {
    const cohort = students.filter(s => s.course === cfg.course);
    if (!cohort.length) continue;

    const marks = cohort.map((student, idx) => {
      const risk = student._risk || 'MEDIUM';
      const pool = markByRisk[risk];
      const marksObtained = pool[idx % pool.length];
      return {
        studentId: student._id,
        rollNo: student.collegeRegNo,
        studentName: student.studentName,
        attendanceStatus: 'Present',
        marksObtained,
        rank: 0,
        remarks: risk === 'LOW' ? 'Excellent' : risk === 'HIGH' ? 'Needs Improvement' : 'Good'
      };
    })
      .sort((a, b) => b.marksObtained - a.marksObtained)
      .map((row, idx) => ({ ...row, rank: idx + 1 }));

    const batch = cfg.course === 'MCA' ? '2025-2027' : '2025-2028';

    await Mark.findOneAndUpdate(
      { course: cfg.course, sessionBatch: batch, semester: 'Semester 1', subject: cfg.subject, examName: cfg.exam },
      {
        $set: {
          teacherId: cfg.teacher._id,
          course: cfg.course,
          sessionBatch: batch,
          semester: 'Semester 1',
          subject: cfg.subject,
          examName: cfg.exam,
          examDate: isoDate(-3),
          maxMarks: 100,
          studentsMarkList: marks,
          status: 'Published'
        }
      },
      upsertOptions
    );
  }
}

async function seedLeaves(students, staff) {
  const highRiskStudent = students.find(s => s._risk === 'HIGH') || students[0];
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
    },
    {
      applicantId: highRiskStudent._id.toString(),
      applicantName: highRiskStudent.studentName,
      applicantRole: 'Student',
      course: highRiskStudent.course,
      semester: highRiskStudent.semester,
      leaveType: 'Personal',
      startDate: dateStr(-8),
      endDate: dateStr(-5),
      totalDays: 4,
      reason: 'Family emergency',
      status: 'Pending',
      hodRemark: ''
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
    ['Demo timetable prepared (with conflicts for AI optimizer)', 'HOD Office', 'Academics', 'SUCCESS'],
    ['AI bridge routes mounted', 'System', 'AI Engine', 'SUCCESS']
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
    console.log('Seed data ready: director, HOD, accountant, 4 teachers, 15 students (HIGH/MEDIUM/LOW risk cohorts), rich attendance + marks + fees + AI-ready conflict-inducing timetable.');
  } catch (error) {
    console.warn('Seed skipped:', error.message);
  }
}

module.exports = { seedAdmin };
