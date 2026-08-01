# ZHI College Management Portal

ZHI College Management Portal ek Node.js + Express + MongoDB based web application hai jisme Director/Admin, HOD, Accountant, Staff, Teacher aur Student related modules manage kiye ja sakte hain.

Is version me original single `server.js` backend ko modular structure me refactor kiya gaya hai, taki config, middleware, models, routes aur utilities alag-alag files me maintain ho sakein.

---

## Main Features

- Director/Admin dashboard
- Role based login:
  - Director
  - HOD
  - Accountant
  - Staff
  - Teacher
  - Student API support
- Student admission and profile management
- Student photo upload
- Staff/teacher/HOD/accountant management
- Finance module:
  - fee structure generation
  - fee collection
  - due/paid calculation
  - transactions
  - expenses
  - finance dashboard stats
- Attendance module:
  - student attendance
  - teacher self-attendance punch in/out
  - attendance history
- Marks/results upload and student result API
- Timetable/routine management
- Notes upload and delete
- Notices/global notice management
- Leave apply and HOD/Admin approval
- Audit logs
- Admin controlled system settings:
  - college name
  - short name
  - logo
  - login background photo
  - active session
  - contact/support email
  - timezone
  - currency
  - maintenance mode
- `.env` based secure configuration
- Cloudinary support for uploads
- Local upload fallback if Cloudinary keys are not configured

---

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Multer
- Cloudinary
- Multer Storage Cloudinary
- Nodemailer
- Dotenv
- CORS

### Frontend

- HTML
- CSS
- Vanilla JavaScript
- Chart.js pages where already used
- Boxicons icons
- Static files served from `public/`

### Database

- MongoDB
- Mongoose schemas/models

### File Uploads

- Cloudinary if these env values are configured:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Otherwise files are saved locally inside:
  - `public/uploads/`

---

## Project Structure

```txt
ZHI-COLLEGE/
├── .env
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── server.js
├── models/
│   ├── Attendance.js
│   ├── Leave.js
│   ├── Marks.js
│   ├── Note.js
│   ├── Routine.js
│   ├── Student.js
│   └── TeacherAttendance.js
├── public/
│   ├── index.html
│   ├── admin_dashboard.html
│   ├── academic_dashboard.html
│   ├── accountant_dashboard.html
│   ├── staff_dashboard.html
│   ├── teacher_dashboard.html
│   ├── SystemSettings.html
│   ├── Finance.html
│   ├── GlobalNotice.html
│   ├── AuditLogs.html
│   ├── students.html
│   ├── staffDirectory.html
│   ├── admissionform.html
│   ├── addstaff.html
│   ├── fee_collection.html
│   ├── manage_expenses.html
│   ├── manage_notices.html
│   ├── mark_attendance.html
│   ├── upload_marks.html
│   ├── upload_notes.html
│   ├── apply_leave.html
│   ├── hodleave.html
│   ├── teacher_profile.html
│   ├── teacher_self_attendance.html
│   ├── teacher_timetable.html
│   ├── js/
│   │   └── settings-client.js
│   ├── uploads/
│   │   └── .gitkeep
│   └── zhi_logo.png
└── src/
    ├── app.js
    ├── config/
    │   ├── cloudinary.js
    │   ├── database.js
    │   ├── env.js
    │   └── mailer.js
    ├── middleware/
    │   ├── asyncHandler.js
    │   ├── errorHandler.js
    │   ├── auth.js
│   └── upload.js
    ├── models/
    │   ├── Attendance.js
    │   ├── AuditLog.js
    │   ├── Expense.js
    │   ├── Leave.js
    │   ├── Mark.js
    │   ├── Note.js
    │   ├── Notice.js
    │   ├── Routine.js
    │   ├── Settings.js
    │   ├── Staff.js
    │   ├── Student.js
    │   ├── StudentFee.js
    │   ├── TeacherAttendance.js
    │   ├── Transaction.js
    │   └── User.js
    ├── routes/
    │   ├── attendanceRoutes.js
    │   ├── auditRoutes.js
    │   ├── authRoutes.js
    │   ├── financeAliasesRoutes.js
    │   ├── financeRoutes.js
    │   ├── leaveRoutes.js
    │   ├── markRoutes.js
    │   ├── miscRoutes.js
    │   ├── pageRoutes.js
    │   ├── noteRoutes.js
    │   ├── noticeRoutes.js
    │   ├── routineRoutes.js
    │   ├── settingsRoutes.js
    │   ├── staffRoutes.js
    │   ├── studentRoutes.js
    │   └── teacherAttendanceRoutes.js
    └── utils/
        ├── audit.js
        ├── finance.js
        ├── jwt.js
        ├── keepAlive.js
        └── seed.js
```

> Note: Root `models/` folder old project compatibility ke liye rakha gaya hai. Active modular backend `src/models/` use karta hai.

---

## Important Files Ka Kaam

### `server.js`

Application bootstrap file hai. Ye:

- dotenv config load karta hai
- MongoDB connect karta hai
- default admin/settings seed karta hai
- Express app start karta hai
- optional keep-alive start karta hai

### `src/app.js`

Express app create karta hai:

- CORS
- JSON parser
- static public folder
- all API routes mount
- error handler

### `src/config/env.js`

Environment variables ko central object me convert karta hai. Project me direct secrets hardcode nahi hain.

### `src/config/database.js`

MongoDB connection handle karta hai.

### `src/middleware/upload.js`

Upload handling:

- Cloudinary configured hai to Cloudinary use hota hai
- Cloudinary empty hai to local `public/uploads/` folder use hota hai

### `src/utils/finance.js`

Finance calculation ka core logic:

- fee structure generate
- payment distribute
- paid/due/status recalculate
- receipt number generate

### `public/js/settings-client.js`

Frontend pages par admin settings apply karta hai:

- logo update
- college name update
- portal subtitle update
- login background update

---

## Environment Variables

Project me `.env` file add hai. Production me values ko actual credentials se replace karein.

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/zhi_college
CORS_ORIGIN=*

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
MAIL_FROM=

ADMIN_EMAIL=admin@zhi.edu.in
ADMIN_PASSWORD=admin123
KEEP_ALIVE_URL=
JWT_SECRET=change-this-jwt-secret
JWT_EXPIRES_IN_SECONDS=86400
```

### Required For Database

```env
MONGO_URI=your-mongodb-uri
```

### Required For Email OTP

```env
SMTP_USER=your-email
SMTP_PASS=your-app-password
MAIL_FROM=your-email
```

### Required For Cloudinary Upload

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Cloudinary values empty rahenge to upload local folder me save hoga.

---

## Install And Run

### 1. Dependencies install

```bash
npm install
```

### 2. `.env` configure

`.env.example` ko reference bana kar `.env` me actual values add karein.

### 3. Start server

```bash
npm start
```

### 4. Development mode

```bash
npm run dev
```

### 5. Syntax check

```bash
npm run check
```

---

## Default Admin Login

Default admin seed `.env` se hota hai:

```txt
Email: admin@zhi.edu.in
Password: admin123
Role: Director
```

Production deploy se pehle `ADMIN_PASSWORD` change karna zaroori hai.

---

## Main Pages

### Login

```txt
public/index.html
```

### Director/Admin

```txt
public/admin_dashboard.html
public/SystemSettings.html
public/users_roles.html
public/students.html
public/Finance.html
public/GlobalNotice.html
public/AuditLogs.html
```

### HOD / Academic

```txt
public/academic_dashboard.html
public/HODtimetable_setup.html
public/hodleave.html
public/attendance_overview.html
```

### Accountant

```txt
public/accountant_dashboard.html
public/fee_collection.html
public/manage_expenses.html
public/all_transactions.html
public/financial_reports.html
public/salarymanagement.html
public/generate_payslips.html
```

### Staff

```txt
public/staff_dashboard.html
public/staffDirectory.html
public/staffstudent.html
public/staffnotice.html
```

### Teacher

```txt
public/teacher_dashboard.html
public/teacher_profile.html
public/teacher_self_attendance.html
public/teacher_timetable.html
public/upload_marks.html
public/upload_notes.html
public/apply_leave.html
public/mark_attendance.html
```

---

## API Routes Summary

### Auth

```txt
POST /api/login
POST /api/forgot-password
POST /api/reset-password
```

### Students

```txt
POST   /api/add-student
POST   /api/upload-photo/:id
GET    /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
```

### Staff

```txt
POST   /api/staff
GET    /api/staff
GET    /api/staff/:id
PUT    /api/staff/:id
DELETE /api/staff/:id
```

### Finance

```txt
GET  /api/finance/search-student
GET  /api/finance/student-fee/:studentId
POST /api/finance/collect-fee
GET  /api/finance/dashboard
GET  /api/finance/stats
GET  /api/finance/transactions
GET  /api/finance/expenses
POST /api/finance/expense
GET  /api/expenses
POST /api/expenses
```

### Notices

```txt
POST   /api/notices
GET    /api/notices
PUT    /api/notices/:id
DELETE /api/notices/:id
```

### Notes

```txt
POST   /api/notes
GET    /api/notes
DELETE /api/notes/:id
```

### Routine / Timetable

```txt
POST   /api/routines
GET    /api/routines
PUT    /api/routines/:id
DELETE /api/routines/:id
```

### Teacher Attendance

```txt
POST /api/teacher-attendance/punch
GET  /api/teacher-attendance
GET  /api/teacher-attendance/:teacherId
```

### Student Attendance

```txt
GET  /api/get-courses
GET  /api/get-batches
GET  /api/get-teacher-skills
GET  /api/get-students
GET  /api/attendances/subject
POST /api/save-attendance
GET  /api/attendance
GET  /api/attendance/student-history/:studentId
```

### Marks / Results

```txt
POST /api/marks/upload
GET  /api/marks/check
GET  /api/marks/student
```

### Leave Management

```txt
GET  /api/leaves
POST /api/leaves/apply
POST /api/leaves/update-status
```

### Settings

```txt
GET  /api/settings/public
GET  /api/settings
PUT  /api/settings
POST /api/settings/password
```

### Audit / Misc

```txt
GET /api/audit-logs
GET /api/admin/dashboard
GET /api/alerts/hod
GET /api/syllabus/progress
```

---

## Role Login Flow

Login page `public/index.html` role ke basis par user ko redirect karta hai:

```txt
director   -> admin_dashboard.html
accountant -> accountant_dashboard.html
hod        -> academic_dashboard.html
staff      -> staff_dashboard.html
teacher    -> teacher_dashboard.html
```

Backend login logic:

- Director login `User` model se check hota hai
- Student login `Student` model se check hota hai
- HOD/Accountant/Staff/Teacher login `Staff` model se check hota hai
- Disabled staff ko login block kiya gaya hai
- Maintenance mode on hone par Director ke alawa login block hota hai

---

## Admin Settings Kaise Kaam Karta Hai

Admin page:

```txt
public/SystemSettings.html
```

Backend:

```txt
src/routes/settingsRoutes.js
src/models/Settings.js
```

Frontend common script:

```txt
public/js/settings-client.js
```

Flow:

1. Admin settings page se logo/name/background save hota hai.
2. Data MongoDB `Settings` collection me save hota hai.
3. Frontend pages `/api/settings/public` call karte hain.
4. `settings-client.js` page par logo/name/background apply karta hai.

---

## Finance Calculation Logic

Finance helper:

```txt
src/utils/finance.js
```

Important functions:

- `generateFeeStructure(courseName)`
- `applyPaymentToHeads(feeRecord, amount, preferredHeadId)`
- `recalcFeeTotals(feeRecord)`
- `receiptNo(prefix)`

Payment collect karte time:

1. Student ledger fetch hota hai.
2. Selected fee head ya automatic heads par payment apply hota hai.
3. `paid`, `due`, `status` update hota hai.
4. Total paid/due recalculate hota hai.
5. Transaction receipt create hoti hai.

Overpayment block kiya gaya hai. Due se zyada payment accept nahi hota.

---

## Upload Logic

Upload middleware:

```txt
src/middleware/upload.js
```

Upload categories:

- student profile photo
- notice attachment
- leave document
- staff files
- notes
- settings logo/background

Cloudinary configured hai to upload Cloudinary par jayega. Agar Cloudinary empty hai to local folder use hoga:

```txt
public/uploads/
```

---

## Deployment Notes

Production deploy se pehle:

1. `.env` me real `MONGO_URI` add karein.
2. `ADMIN_PASSWORD` change karein.
3. Cloudinary keys add karein agar persistent uploads chahiye.
4. SMTP credentials add karein agar forgot password OTP use karna hai.
5. `NODE_ENV=production` set karein.
6. `KEEP_ALIVE_URL` sirf tab set karein jab hosting platform ko keep-alive chahiye.

---

## Security Notes

- Database URI, Cloudinary key, email password code me hardcode nahi hone chahiye.
- `.env` ko public repository me commit nahi karna chahiye.
- Production me default admin password use nahi karna chahiye.
- Passwords ab PBKDF2-SHA256 hash format me store hote hain. Existing plain demo passwords login/reset ke time auto-upgrade ho sakte hain.
- Backend JWT/session auth aur role middleware enabled hai; self-profile update ke liye dedicated protected API use hoti hai.

---

## Future Improvements

- Optional bcrypt/argon2 migration if external dependencies are allowed
- Separate React/Vue frontend
- Better reports and analytics
- PDF receipt generation
- Automated tests
- API documentation using Swagger/OpenAPI
- Database backup/restore module

---

## Maintainer Notes

Is project ka active backend modular code `src/` folder ke andar hai. Agar naya feature add karna ho to recommended pattern:

1. Schema add/update karein: `src/models/`
2. Route add karein: `src/routes/`
3. Common logic ho to utility banayein: `src/utils/`
4. Upload/file work ho to `src/middleware/upload.js` reuse karein
5. Route ko `src/app.js` me mount karein


---

## Latest Update: JWT Security, Seed Data & Mongoose Warning Fix

This version includes three important backend/security upgrades.

### 1. Mongoose Deprecation Warning Fixed

Mongoose update options were changed from:

```js
{ new: true }
```

to:

```js
{ returnDocument: 'after' }
```

Updated areas include:

- `src/models/Settings.js`
- `src/routes/settingsRoutes.js`
- `src/routes/studentRoutes.js`
- `src/routes/staffRoutes.js`
- `src/routes/noticeRoutes.js`
- `src/routes/routineRoutes.js`
- `src/routes/teacherAttendanceRoutes.js`
- `src/routes/attendanceRoutes.js`
- `src/routes/markRoutes.js`
- `src/routes/leaveRoutes.js`
- `src/utils/seed.js`

### 2. Full Demo Seed Data

`src/utils/seed.js` now creates realistic demo data for the full portal:

- Director admin account
- HOD account
- Accountant account
- Office staff account
- Teacher accounts
- Student accounts
- Student fee ledgers
- Fee transactions
- Expenses
- Global notices
- Teacher timetable/routines
- Teacher attendance logs
- Student attendance records
- Marks/results
- Leave applications
- Audit logs
- Default system settings

The seed is idempotent, meaning it can run multiple times without intentionally duplicating demo records.

#### Demo Logins

```txt
Director
Email: admin@zhi.edu.in
Password: admin123
Role: Director

HOD
Email: hod@zhi.edu.in
Password: hod123
Role: HOD

Accountant
Email: accountant@zhi.edu.in
Password: account123
Role: Accountant

Staff
Email: staff@zhi.edu.in
Password: staff123
Role: Staff

Teacher
Email: teacher@zhi.edu.in
Password: teacher123
Role: Teacher

Student
Email: aman.raj@student.zhi.edu.in
Password: 9876510001
Role: Student
```

### 3. JWT Authentication & Protected Pages

JWT authentication has been added without adding an extra npm package. The project uses a small HS256 JWT utility built with Node.js `crypto`.

New files:

```txt
src/utils/jwt.js
src/middleware/auth.js
src/routes/pageRoutes.js
public/js/auth-client.js
```

#### Auth Flow

1. User logs in from `index.html`.
2. Backend verifies credentials.
3. Backend generates a JWT token.
4. Backend returns token in JSON response.
5. Backend also sets an HTTP-only cookie named `zhi_token`.
6. Frontend stores token in `localStorage`.
7. `public/js/auth-client.js` automatically attaches:

```txt
Authorization: Bearer <token>
```

to same-origin `/api/*` calls.

8. Sensitive HTML pages are served through protected Express routes.

---

## Latest Update: Real-World Dashboard/Profile Cleanup

This build also adds the requested dashboard/profile changes:

- Teacher, HOD, Staff, Accountant and Director sidebars are normalized through `public/js/role-ui.js`.
- Sidebar logo uses `zhi_logo.png` by default and follows the admin-controlled logo from `SystemSettings`.
- Topbar/sidebar profile avatar and user name are loaded dynamically from `/api/profile/me`.
- Teacher, Staff, HOD, Accountant and Director users can update their own profile photo, name and basic details from `teacher_profile.html`.
- Password change verifies the current password on the backend and stores the new password as a hash.
- Staff create/update and student update paths hash passwords before saving.
- Staff create/update/delete is restricted to Director; other users update only their own profile through the profile API.

New/updated files:

```txt
src/utils/password.js
src/routes/profileRoutes.js
public/js/role-ui.js
public/teacher_profile.html
```

#### Protected Page Routes

Examples:

```txt
/admin_dashboard
/accountant_dashboard
/academic_dashboard
/staff_dashboard
/teacher_dashboard
/SystemSettings
/Finance
/AuditLogs
```

Old `.html` paths are still supported through protected Express routes for compatibility, but they are no longer served directly by unprotected static middleware.

#### Important Security Files

```txt
src/middleware/auth.js
```

Provides:

- JWT token extraction from `Authorization` header
- JWT token extraction from `zhi_token` cookie
- role-based route protection
- redirect to `/index.html` for unauthorized page requests
- JSON `401/403` for unauthorized API requests

```txt
src/routes/pageRoutes.js
```

Maps protected pages to allowed roles. Example:

```js
router.get('/admin_dashboard', requireAuth(['director']), sendPage('admin_dashboard.html'));
```

```txt
public/js/auth-client.js
```

Automatically patches frontend `fetch()` so API calls include the JWT token.

### JWT Environment Variables

Add these values to `.env` in production:

```env
JWT_SECRET=use-a-long-random-secret-in-production
JWT_EXPIRES_IN_SECONDS=86400
```

Production note: never deploy with `JWT_SECRET=change-this-jwt-secret`.

---

## Updated Step-by-Step Run Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure `.env`

Minimum required:

```env
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-long-random-secret
ADMIN_EMAIL=admin@zhi.edu.in
ADMIN_PASSWORD=change-this-password
```

Optional but recommended:

```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
SMTP_USER=your-email
SMTP_PASS=your-email-app-password
MAIL_FROM=your-email
```

### 3. Start Server

```bash
npm start
```

On startup, `src/utils/seed.js` runs automatically and prepares demo data.

### 4. Login

Open the login page and use one of the demo credentials listed in this README.

### 5. Access Protected Pages

Use these URLs after login:

```txt
/admin_dashboard
/accountant_dashboard
/academic_dashboard
/staff_dashboard
/teacher_dashboard
```

If the JWT token/cookie is missing or invalid, the server redirects the browser to:

```txt
/index.html
```

### 6. API Calls

Frontend pages do not need to manually add headers. `public/js/auth-client.js` automatically adds the JWT header for `/api/*` requests.

Manual API example:

```js
fetch('/api/students', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('authToken')}`
  }
});
```
