<div align="center">

# 🎓 ZHI AI-Powered College Management System

**Node.js + Express + MongoDB ERP** for a full college workflow, now upgraded with a
**Python + FastAPI microservice** hosting 5 AI modules.

![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.1-FF6600)
![License](https://img.shields.io/badge/license-ISC-blue)

</div>

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Architecture](#-architecture)
3. [AI Modules](#-ai-modules)
4. [Feature Matrix](#-feature-matrix)
5. [Repository Layout](#-repository-layout)
6. [Environment Variables](#-environment-variables)
7. [Local Setup](#-local-setup)
8. [Deploy on Render](#-deploy-on-render)
9. [API Reference](#-api-reference)
10. [Frontend Usage](#-frontend-usage)
11. [Retraining on Real Data](#-retraining-on-real-data)
12. [Troubleshooting](#-troubleshooting)

---

## 🧭 Overview

**ZHI** is a role-based college portal covering admissions, academics,
attendance, finance and reporting. The **AI microservice** layered on top
adds real-time predictions and document intelligence — powered by
XGBoost, Isolation Forest and Tesseract OCR — without touching the
existing MongoDB schema.

**Two services, one repo, one database.**

---

## 🏗 Architecture

```
                          ┌──────────────────────────────┐
                          │           Browser            │
                          │  admin_dashboard.html · etc. │
                          └──────────────┬───────────────┘
                                         │  HTTPS (session cookie)
                                         ▼
                ┌────────────────────────────────────────────┐
                │   Node.js + Express (zhi-erp)              │
                │   /api/students · /api/finance · /api/ai/* │
                │   - auth · sessions · static UI            │
                │   - AI proxy w/ X-Internal-Key             │
                └──────┬──────────────────────┬──────────────┘
                       │  Mongoose            │  Axios + X-Internal-Key
                       ▼                      ▼
             ┌───────────────────┐    ┌────────────────────────────┐
             │  MongoDB Atlas    │◀───│  Python FastAPI            │
             │  zhi_college DB   │    │  (zhi-ai-service)          │
             │                   │    │  /ai/performance           │
             │                   │    │  /ai/at-risk               │
             │                   │    │  /ai/attendance-risk       │
             │                   │    │  /ai/finance-anomaly       │
             │                   │    │  /ai/document (OCR)        │
             └───────────────────┘    └────────────────────────────┘
```

**Key design points**

- The FastAPI service is **not** exposed publicly — it only accepts calls
  carrying the shared `X-Internal-Key` header.
- Both services connect to the **same** MongoDB Atlas cluster.
- The browser only ever talks to the Node service.
- `.pkl` models live inside the Python service and are (re)generated at
  build-time on Render.

---

## 🤖 AI Modules

| # | Module | Algorithm | Endpoint | Purpose |
|---|---|---|---|---|
| 1 | Student Performance Prediction | XGBoost Regressor | `POST /ai/performance` | Predicts final % score, grade and risk band |
| 2 | At-Risk Student Detection | XGBoost Classifier | `POST /ai/at-risk` | Dropout probability + top contributing factors |
| 3 | Attendance Risk | Deterministic rule engine | `POST /ai/attendance-risk` | Classes needed to reach 75 %, status label |
| 4 | Financial Anomaly Detection | Isolation Forest | `POST /ai/finance-anomaly` | Flags suspicious transactions (per-item score) |
| 5 | College Document AI | Tesseract OCR + regex NLP | `POST /ai/document` | Marksheet / Aadhaar / PAN / ID → structured JSON |

---

## ✅ Feature Matrix

<details><summary><b>Existing ERP features (unchanged)</b></summary>

- Role-based login: Director, HOD, Accountant, Staff, Teacher
- Student admission, profile & photo upload (Cloudinary)
- Staff / teacher directory
- Finance: fee structure, fee collection, expenses, audit
- Attendance for students & teachers
- Marks upload, notes, notices
- Timetable, syllabus, leave requests
- Reports & analytics dashboards
- Audit log with role-scoped views

</details>

<details open><summary><b>AI additions</b></summary>

- 🧠 Live "AI Insights" panel on `admin_dashboard.html`
- 🚨 Finance anomaly banner (last 30 days scan)
- 🎓 At-risk cohort probe with risk badge
- 📄 One-click OCR upload modal → returns extracted fields
- 🟢 AI service health footer with per-model load status
- 🛠 `train_real_models.py` retrains on live Mongo data

</details>

---

## 📁 Repository Layout

```
nayaerp/
├── render.yaml                      # ⚡ Render blueprint (both services)
├── RENDER_DEPLOY.md                 # 📖 Step-by-step Render deploy guide
├── server.js                        # Node entrypoint
├── package.json                     # +axios +form-data
├── .env.example                     # +AI_SERVICE_URL, +AI_SERVICE_API_KEY
├── src/
│   ├── app.js                       # mounts /api/ai
│   ├── controllers/
│   │   └── aiController.js          # 🆕 axios → FastAPI
│   ├── routes/
│   │   └── aiRoutes.js              # 🆕 5 AI endpoints + multer
│   └── models/  middleware/  utils/ config/  (existing)
├── public/
│   ├── admin_dashboard.html         # 🔧 real AI insights + OCR modal
│   ├── js/
│   │   ├── ai-client.js             # 🆕 window.ZhiAI helpers
│   │   ├── auth-client.js           (existing)
│   │   └── role-ui.js               (existing)
│   └── (all other dashboards)       (existing)
└── zhi-ai-service/                  # 🆕 Python FastAPI microservice
    ├── main.py                      # 5 endpoints + Pydantic schemas
    ├── database.py                  # Motor async Mongo
    ├── train_dummy_models.py        # synthetic-only training
    ├── train_real_models.py         # 🆕 trains on real Mongo data
    ├── requirements.txt
    ├── Aptfile                      # tesseract-ocr, poppler-utils
    ├── .env.example
    ├── README.md
    └── ml_models/*.pkl              # generated at build time
```

---

## 🔐 Environment Variables

### Node service (`nayaerp/.env`)

| Var | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Render provides `$PORT` automatically |
| `MONGO_URI` | `mongodb+srv://…` | Same cluster used by both services |
| `JWT_SECRET` | `…` | Session signing |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | | Seeded on first boot |
| `CORS_ORIGIN` | `*` (dev) / your domain | |
| `AI_SERVICE_URL` | `https://zhi-ai-service.onrender.com` | Python service URL |
| `AI_SERVICE_API_KEY` | `<64-char random>` | Must match Python service |
| `AI_SERVICE_TIMEOUT_MS` | `60000` | Node → FastAPI timeout |

### Python service (`zhi-ai-service/.env`)

| Var | Example | Notes |
|---|---|---|
| `AI_SERVICE_ENV` | `production` | |
| `AI_SERVICE_API_KEY` | `<same as above>` | Shared secret |
| `AI_CORS_ORIGINS` | `https://zhi-erp.onrender.com` | Only your Node domain |
| `MONGO_URI` | `mongodb+srv://…` | Same as Node |
| `MONGO_DB_NAME` | `zhi_college` | |
| `ML_MODELS_DIR` | `./ml_models` | |
| `TESSERACT_CMD` | `/usr/bin/tesseract` | Installed via Aptfile |
| `OCR_LANG` | `eng` | |

**Generate a strong shared key:** `openssl rand -hex 32`

---

## 🖥 Local Setup

### 1. Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Tesseract OCR: `sudo apt install tesseract-ocr poppler-utils` (Linux) or `brew install tesseract poppler` (macOS)

### 2. Node service

```bash
git clone <your-repo> && cd nayaerp
cp .env.example .env      # edit MONGO_URI, AI_SERVICE_URL=http://127.0.0.1:8000
npm install
npm run dev
# → http://localhost:5000
```

### 3. Python service

```bash
cd zhi-ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # edit MONGO_URI + AI_SERVICE_API_KEY (same as Node)
python train_dummy_models.py     # writes 3 .pkl files
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 4. Verify

```bash
curl http://localhost:5000/api/ai/health
# → { "success": true, "ai": { "status": "ready", ... } }
```

---

## 🚀 Deploy on Render

**See [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md) for the complete step-by-step guide with screenshots-worth-of-detail.**

TL;DR:

1. Push repo to GitHub
2. `openssl rand -hex 32` → save the key
3. Render → New + → **Blueprint** → pick this repo (reads `render.yaml`)
4. Fill in `sync: false` secrets (Mongo URI, API key, admin creds)
5. Deploy both services → done

---

## 📡 API Reference

All endpoints below are the **Node-side** paths. The browser calls Node,
Node forwards to FastAPI internally.

### `GET /api/ai/health`
Returns FastAPI readiness + per-model load status.
```json
{ "success": true, "ai": { "status": "ready", "mongo": true,
  "models_loaded": { "performance": true, "at_risk": true, "finance_anomaly": true } } }
```

### `POST /api/ai/performance`
```json
{
  "student_id": "STU-101",
  "attendance_pct": 82,
  "avg_internal_marks": 75,
  "assignments_submitted_pct": 90,
  "fee_paid": 1,
  "backlogs_count": 0,
  "hours_studied_per_week": 12
}
```
→ `predicted_final_score`, `predicted_grade`, `risk_category`.

### `POST /api/ai/at-risk`
```json
{ "attendance_pct": 55, "avg_internal_marks": 40,
  "backlogs_count": 3, "fee_pending_months": 4, "disciplinary_actions": 1 }
```
→ `dropout_probability`, `risk_level`, `top_factors[]`.

### `POST /api/ai/attendance-risk`
```json
{ "classes_attended": 40, "classes_conducted": 60,
  "classes_remaining": 20, "threshold_pct": 75 }
```
→ `current_pct`, `classes_needed_to_reach_threshold`, `status`, `recommendation`.

### `POST /api/ai/finance-anomaly`
Either supply explicit transactions **or** ask FastAPI to scan Mongo:
```json
{ "scan_recent_days": 30 }
```
→ `total_checked`, `anomalies_found`, `items[]`.

### `POST /api/ai/document`
Multipart upload, field name `file` (jpg / png / pdf, ≤15 MB).
→ `doc_type_guess`, `raw_text`, `extracted{}`.

---

## 🎨 Frontend Usage

The admin dashboard already wires up all AI signals. To use AI on another page:

```html
<script src="/js/ai-client.js" defer></script>
<div id="perf-card"></div>
<script>
  ZhiAI.showPerformance('perf-card', {
    attendance_pct: 82, avg_internal_marks: 75,
    assignments_submitted_pct: 90, fee_paid: 1,
    backlogs_count: 0, hours_studied_per_week: 12
  });
</script>
```

Available helpers on `window.ZhiAI`:
`health · predictPerformance · predictAtRisk · attendanceRisk · financeAnomaly · uploadDocument · showPerformance · showAtRisk · showAttendance · showFinanceAnomalies · showDocumentUpload`.

---

## 🧠 Retraining on Real Data

After enough students/transactions exist in your MongoDB:

```bash
cd zhi-ai-service
python train_real_models.py
```

The script:

- Reads `students`, `marks`, `attendances`, `transactions` collections.
- Falls back to alternative collection names (`feetransactions`, `examresults`, etc.).
- Builds per-student feature rows + per-transaction feature rows.
- **Tops up with synthetic samples** if a collection has fewer than 40 rows.
- Overwrites the `.pkl` artefacts atomically.

On Render, wire this into the **Build Command** of the Python service:

```
pip install -r requirements.txt && python train_real_models.py
```

---

## 🛟 Troubleshooting

| Symptom | Fix |
|---|---|
| Dashboard shows "AI Service Unreachable" | Check `AI_SERVICE_URL` on Node service + Python service is not sleeping (free tier cold-start ~30 s). |
| `401 Invalid or missing X-Internal-Key` | `AI_SERVICE_API_KEY` mismatch between the two services. |
| `503 model not loaded` | Missing `.pkl` — rerun `train_dummy_models.py` or `train_real_models.py`. |
| OCR returns empty text | Tesseract not installed (check `Aptfile`), or image quality too low. |
| CORS error in browser console | Add your Node domain to `AI_CORS_ORIGINS` on the Python service. |
| Free tier "hangs" for 30 s | Cold start — use Render Starter plan or set up a keep-alive ping. |

---

<div align="center">

Made with 🧠 XGBoost, 🌲 Isolation Forest, and 📄 Tesseract OCR.

</div>
