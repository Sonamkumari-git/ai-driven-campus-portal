# AI-Driven Campus Portal

![Node.js](https://img.shields.io/badge/Node.js-v16+-green) ![Express](https://img.shields.io/badge/Express-v5.2+-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-v7.1+-green) ![License](https://img.shields.io/badge/License-ISC-yellow)

An intelligent, next-generation College Management System built with **Node.js**, **Express**, and **MongoDB**. This platform integrates enterprise-grade role-based access control, AI-ready data structures, and comprehensive academic, financial, and administrative modules designed for smart campus operations.

**🚀 Live Demo:** [https://college-erp-3gxa.onrender.com](https://college-erp-3gxa.onrender.com)

---

## 🌟 Key Features

### Authentication & Authorization
- **Secure JWT Authentication** with HTTP-only cookies
- **Role-Based Access Control (RBAC)** for 6 user roles
- **Multi-level login flow** with role-specific dashboards
- **Password hashing** using PBKDF2-SHA256
- **Session management** with automatic token refresh

### Core Modules

#### 📊 Administrative Dashboard (Director/Admin)
- System-wide analytics and key performance indicators
- User management (staff, teachers, students)
- System settings and configuration
- Audit log tracking
- Maintenance mode control

#### 💰 Finance Module
- **Fee structure generation** per course and program
- **Fee collection and tracking** with multiple payment modes
- **Expense management** with voucher system
- **Automated payment distribution** across fee heads
- **Financial reporting and analytics**
- **Transaction ledger** with receipt generation
- **Salary management** and payslip generation

#### 📚 Academics Module
- Student admission and profile management
- Course and semester management
- Batch tracking and registration
- Comprehensive student records

#### 👥 Staff Management
- Staff directory with detailed profiles
- Teacher profiles with qualifications and experience
- Role-specific staff categories
- Bank account and salary details

#### 📋 Attendance System
- **Student attendance tracking** with subject-wise marking
- **Teacher self-attendance** with punch-in/punch-out
- **Real-time attendance metrics** and history reports
- **Attendance-based analytics** for dropout prediction

#### 📝 Marks & Results
- Exam result upload and management
- Student grade tracking
- Performance analytics
- Result publication workflow

#### 🗓️ Timetable & Scheduling
- Course and section timetable management
- Room and resource allocation
- **Built-in conflict detection** for AI optimization
- Teacher load balancing

#### 📢 Communication
- Global notice posting and management
- Role-based notice targeting
- Staff-specific announcements

#### 🎓 Leave Management
- Staff and student leave applications
- Multiple leave types (Casual, Sick, Personal, etc.)
- HOD approval workflow
- Leave history and statistics

#### 📖 Resource Management
- Teacher notes upload and sharing
- Subject-wise note organization
- Student access to course materials

### AI-Ready Features
- **Risk profile stratification** (HIGH/MEDIUM/LOW) for dropout prediction
- **Engineered seed data** with realistic patterns
- **Time-series financial data** for forecasting models
- **Timetable conflicts** built-in for optimization algorithms
- **Comprehensive audit logs** for model training

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js** | Runtime environment |
| **Express.js 5.2+** | Web framework |
| **MongoDB 7.1+** | NoSQL database |
| **Mongoose 9.3+** | ODM for MongoDB |
| **JWT (HS256)** | Authentication |
| **Multer 1.4+** | File upload handling |
| **Cloudinary 1.41+** | Cloud file storage |
| **Nodemailer 6.9+** | Email service |
| **CORS** | Cross-origin requests |
| **dotenv** | Environment management |

### Frontend
- **HTML5** / **CSS3** for responsive UI
- **Vanilla JavaScript** (ES6+)
- **Chart.js** for data visualization
- **Boxicons** icon library

### Database
- **MongoDB Atlas** or self-hosted MongoDB
- **Mongoose schemas** with validation
- **Indexed queries** for performance
- **Transaction support** for financial operations

### Deployment
- **Render.com** (current production)
- **Environment-based configuration**
- **Keep-alive service** for uptime

---

## 📁 Project Structure

```
ai-driven-campus-portal/
├── 📄 server.js                          # Application bootstrap
├── 📄 package.json                       # Dependencies
├── 📂 src/
│   ├── 📄 app.js                         # Express app configuration
│   ├── 📂 config/                        # Configuration files
│   │   ├── env.js
│   │   ├── database.js
│   │   ├── cloudinary.js
│   │   └── mailer.js
│   ├── 📂 middleware/                    # Custom middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── asyncHandler.js
│   │   └── upload.js
│   ├── 📂 models/                        # Database schemas
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Staff.js
│   │   ├── StudentFee.js
│   │   ├── Transaction.js
│   │   ├── Expense.js
│   │   ├── Attendance.js
│   │   ├── Mark.js
│   │   ├── Routine.js
│   │   ├── Notice.js
│   │   ├── Leave.js
│   │   ├── Settings.js
│   │   ├── AuditLog.js
│   │   └── // + more models
│   ├── 📂 routes/                        # API route handlers
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── staffRoutes.js
│   │   ├── financeRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── markRoutes.js
│   │   ├── routineRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── noticeRoutes.js
│   │   ├── settingsRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── pageRoutes.js
│   │   └── // + more routes
│   └── 📂 utils/                         # Utility functions
│       ├── seed.js
│       ├── finance.js
│       ├── jwt.js
│       ├── password.js
│       ├── audit.js
│       └── keepAlive.js
├── 📂 public/                            # Frontend assets
│   ├── 📄 index.html
│   ├── 📄 admin_dashboard.html
│   ├── 📄 academic_dashboard.html
│   ├── 📄 accountant_dashboard.html
│   ├── 📄 staff_dashboard.html
│   ├── 📄 teacher_dashboard.html
│   ├── 📄 SystemSettings.html
│   ├── 📄 Finance.html
│   ├── 📂 js/
│   │   ├── auth-client.js
│   │   ���── role-ui.js
│   │   └── settings-client.js
│   ├── 📂 uploads/
│   └── 🖼️ zhi_logo.png
└── 📂 ai_engine/                         # AI/ML integration
    ├── kaggle_notebooks/
    ├── saved_models/
    └── python_service/
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v16 or higher
- **MongoDB** (Atlas or self-hosted)
- **npm** or **yarn**
- (Optional) **Cloudinary** account

### 1. Clone Repository

```bash
git clone https://github.com/Sonamkumari-git/ai-driven-campus-portal.git
cd ai-driven-campus-portal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/zhi_college

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN_SECONDS=86400

# Admin Credentials (Change in production!)
ADMIN_EMAIL=admin@zhi.edu.in
ADMIN_PASSWORD=admin123

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
MAIL_FROM=your-email@gmail.com

# CORS Settings
CORS_ORIGIN=*

# Uptime Ping (Render)
KEEP_ALIVE_URL=https://your-app.onrender.com/
```

### 4. Start the Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The application will auto-seed demo data and start at `http://localhost:5000`

### 5. Access the Portal

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Director** | admin@zhi.edu.in | admin123 |
| **HOD** | hod@zhi.edu.in | hod123 |
| **Accountant** | accountant@zhi.edu.in | account123 |
| **Office Staff** | staff@zhi.edu.in | staff123 |
| **Teacher** | teacher@zhi.edu.in | teacher123 |
| **Student** | aman.raj@student.zhi.edu.in | 9876510001 |

⚠️ **Change all default passwords in production!**

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/login                    # User login
POST   /api/forgot-password          # Request password reset
POST   /api/reset-password           # Reset with OTP
```

### Students
```
POST   /api/add-student              # Create new student
GET    /api/students                 # List all students
GET    /api/students/:id             # Get student details
PUT    /api/students/:id             # Update student
DELETE /api/students/:id             # Delete student
POST   /api/upload-photo/:id         # Upload student photo
```

### Staff
```
POST   /api/staff                    # Create staff member
GET    /api/staff                    # List all staff
GET    /api/staff/:id                # Get staff details
PUT    /api/staff/:id                # Update staff
DELETE /api/staff/:id                # Delete staff
```

### Finance
```
GET    /api/finance/search-student   # Search student
GET    /api/finance/student-fee/:id  # Get fee ledger
POST   /api/finance/collect-fee      # Record payment
GET    /api/finance/dashboard        # Finance metrics
GET    /api/finance/transactions     # Transaction history
POST   /api/finance/expense          # Create expense
```

### Attendance
```
POST   /api/save-attendance          # Mark attendance
GET    /api/attendance               # Get records
GET    /api/attendance/student-history/:id
POST   /api/teacher-attendance/punch # Teacher punch
GET    /api/teacher-attendance       # Teacher records
```

### Academics
```
POST   /api/marks/upload             # Upload results
GET    /api/marks/student            # Get marks
GET    /api/routines                 # Get timetable
POST   /api/routines                 # Create routine
```

### Notices
```
POST   /api/notices                  # Create notice
GET    /api/notices                  # List notices
PUT    /api/notices/:id              # Update notice
DELETE /api/notices/:id              # Delete notice
```

### Leave
```
GET    /api/leaves                   # List applications
POST   /api/leaves/apply             # Apply for leave
POST   /api/leaves/update-status     # Approve/Reject
```

### Settings
```
GET    /api/settings/public          # Get public settings
GET    /api/settings                 # Get all settings
PUT    /api/settings                 # Update settings
POST   /api/settings/password        # Change password
```

### User Profile
```
GET    /api/profile/me               # Get own profile
PUT    /api/profile/me               # Update profile
POST   /api/profile/change-password  # Change password
```

### Audit
```
GET    /api/audit-logs               # Get audit trail
GET    /api/admin/dashboard          # Admin metrics
```

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based stateless authentication** (HS256)
- **HTTP-only cookies** for token storage
- **Role-based access control** with middleware
- **Protected API & page routes**
- **Automatic redirects** for unauthorized access

### Password Security
- **PBKDF2-SHA256 hashing** for storage
- **Automatic password upgrade** from plain text
- **Password change verification**
- **Secure password reset** with OTP

### Data Protection
- **CORS** configuration
- **Environment-based secrets** (no hardcoded values)
- **MongoDB injection prevention** via Mongoose
- **Audit logging** for critical operations

### Deployment Security
- **.env file** excluded from git
- **Strong JWT_SECRET** in production
- **Database credentials** stored securely
- **API rate limiting** ready

---

## 📊 Database Schema

**Collections:**
- Users, Students, Staff
- StudentFee, Transactions, Expenses
- Attendance, TeacherAttendance
- Marks, Routine, Leave
- Notice, Note, Settings, AuditLog

All collections include:
- Proper indexing for performance
- Mongoose validation
- Timestamp tracking
- Transaction support

---

## 🤖 AI Integration

### AI-Ready Features
- **Risk Profiling**: HIGH/MEDIUM/LOW cohorts
- **Predictive Models**: Dropout prediction, performance forecasting
- **Time-Series Data**: Financial forecasting
- **Optimization**: Timetable conflict detection

### AI Engine Setup
```bash
cd ai_engine/python_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Add to `.env`:
```env
AI_SERVICE_URL=http://localhost:8001
```

---

## 📤 File Uploads

### Storage Options
- **Cloudinary**: If configured in `.env`
- **Local**: Fallback to `public/uploads/`

### Upload Categories
- Student profile photos
- Notice attachments
- Leave documents
- Course notes
- System logo & backgrounds

---

## 🌐 Deployment

### Render.com (Current Production)

**Live:** [https://college-erp-3gxa.onrender.com](https://college-erp-3gxa.onrender.com)

**Steps:**
1. Connect GitHub repository to Render
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add environment variables in Render dashboard
5. Deploy!

**Keep-Alive:**
- Set `KEEP_ALIVE_URL` to prevent spin-down
- Service pings every 14 minutes

### Alternative Platforms
- **Heroku**: Procfile + CLI
- **Railway**: GitHub integration
- **Replit**: Browser-based
- **AWS/GCP**: Docker containerization

---

## 🧪 Testing & Validation

### Seed Data
- **Idempotent**: Safe to run multiple times
- **Realistic patterns**: Attendance variation, fee delays, conflicts
- **Complete**: All roles and modules pre-populated

### Syntax Check
```bash
npm run check
```

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ❌ | development | Environment |
| `PORT` | ❌ | 5000 | Server port |
| `MONGO_URI` | ✅ | - | MongoDB URI |
| `JWT_SECRET` | ✅ | - | JWT secret (change in prod!) |
| `JWT_EXPIRES_IN_SECONDS` | ❌ | 86400 | Token expiration |
| `ADMIN_EMAIL` | ❌ | admin@zhi.edu.in | Admin email |
| `ADMIN_PASSWORD` | ❌ | admin123 | Admin password (change!) |
| `CLOUDINARY_CLOUD_NAME` | ❌ | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ❌ | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ❌ | - | Cloudinary secret |
| `SMTP_HOST` | ❌ | - | Email SMTP host |
| `SMTP_PORT` | ❌ | 465 | Email SMTP port |
| `SMTP_USER` | ❌ | - | Email account |
| `SMTP_PASS` | ❌ | - | Email password |
| `MAIL_FROM` | ❌ | - | Sender email |
| `CORS_ORIGIN` | ❌ | * | CORS origin |
| `KEEP_ALIVE_URL` | ❌ | - | Uptime ping URL |

---

## 📈 Performance

- **Database Indexing**: All frequently queried fields indexed
- **Connection Pooling**: Mongoose pooling configured
- **Static Caching**: CSS, JS, images with cache headers
- **Lazy Loading**: On-demand data loading
- **Query Optimization**: Selective field projection

---

## 🐛 Troubleshooting

### MongoDB Connection
```
Error: connect ECONNREFUSED
```
- Verify `MONGO_URI` is correct
- Ensure MongoDB server is running
- Whitelist IP in Atlas Network Access

### JWT Token Errors
```
Error: Invalid token
```
- Ensure `JWT_SECRET` matches deployment
- Clear localStorage and re-login
- Check token expiration

### File Upload Issues
- Verify Cloudinary credentials OR
- Check `public/uploads/` folder permissions (755)
- Ensure storage configuration

### Render Keep-Alive
- Set `KEEP_ALIVE_URL` to HTTPS app URL
- Service pings every 14 minutes

---

## 📚 Architecture

### Why Modular Structure?
- **Separation of Concerns**: Clear folder organization
- **Scalability**: Easy feature addition
- **Maintainability**: Team collaboration
- **Testing**: Isolated components

### Why JWT?
- **Stateless**: No server session storage
- **Scalable**: Horizontal scaling ready
- **Mobile-Friendly**: Easy mobile implementation
- **Standard**: Industry-standard

### Why MongoDB?
- **Flexibility**: Document-based schema
- **Scalability**: Sharding support
- **Performance**: Fast read/write
- **Cost-Effective**: Free tier available

---

## 🔄 Development Workflow

### Adding New Feature

1. **Create Model** (`src/models/FeatureName.js`)
2. **Create Routes** (`src/routes/featureRoutes.js`)
3. **Create Frontend** (`public/feature.html`)
4. **Mount Route** (`src/app.js`)
5. **Test Locally** (`npm run dev`)

---

## 📄 License

ISC License — See `LICENSE` file

---

## 👨‍💻 Contributing

Contributions welcome! Follow modular structure and test thoroughly.

---

## 📞 Support

- **Issues**: GitHub issues
- **Email**: admin@zhi.edu.in
- **Live Demo**: https://college-erp-3gxa.onrender.com

---

## 🎯 Roadmap

- [ ] Advanced reporting with PDF export
- [ ] Mobile app (React Native)
- [ ] Real-time notifications (WebSockets)
- [ ] Automated backups
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Automated testing
- [ ] Advanced analytics
- [ ] ML model integration

---

