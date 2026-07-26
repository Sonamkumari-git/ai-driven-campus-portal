<div align="center">

# 🧠 ZHI AI Service

**Python + FastAPI microservice** powering the 5 AI modules of the ZHI College ERP.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.1-FF6600)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E?logo=scikitlearn&logoColor=white)
![Tesseract](https://img.shields.io/badge/Tesseract-OCR-4285F4)
![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb&logoColor=white)

</div>

---

## 📌 What this service does

| # | Endpoint | Model | Output |
|---|---|---|---|
| 1 | `POST /ai/performance` | **XGBoost Regressor** | Final % score · grade · risk band |
| 2 | `POST /ai/at-risk` | **XGBoost Classifier** | Dropout probability · risk level · top factors |
| 3 | `POST /ai/attendance-risk` | Rule engine | Current % · classes needed · status |
| 4 | `POST /ai/finance-anomaly` | **Isolation Forest** | Anomaly score per transaction |
| 5 | `POST /ai/document` | **Tesseract OCR + regex NLP** | Structured JSON from marksheet / Aadhaar / PAN / ID |

Plus health probes: `GET /health/live`, `GET /health/ready`, `GET /` and `/docs` (Swagger UI).

---

## 🔐 Auth

Every non-health request **must** include:

```
X-Internal-Key: <value of AI_SERVICE_API_KEY>
```

Requests without this header get `401`. The key is a **shared secret** between
this service and the Node.js ERP; it never leaves the server side.

---

## 📁 Layout

```
zhi-ai-service/
├── main.py                     # FastAPI app + all 5 endpoints + Pydantic schemas
├── database.py                 # Async Motor MongoDB connector
├── train_dummy_models.py       # Synthetic training (fast, offline)
├── train_real_models.py        # Trains from real Mongo collections
├── requirements.txt            # FastAPI, XGBoost, sklearn, Motor, pytesseract…
├── Aptfile                     # Render OS packages (tesseract, poppler)
├── .env.example
├── .gitignore
├── README.md                   # (this file)
└── ml_models/                  # generated .pkl artefacts
    ├── performance_model.pkl
    ├── at_risk_model.pkl
    └── finance_anomaly_model.pkl
```

---

## ⚙️ Environment

```bash
cp .env.example .env
```

| Key | Default | Notes |
|---|---|---|
| `AI_SERVICE_HOST` | `0.0.0.0` | |
| `AI_SERVICE_PORT` | `8000` | Render injects `$PORT` in production |
| `AI_SERVICE_ENV` | `development` | `production` disables `--reload` |
| `AI_SERVICE_LOG_LEVEL` | `INFO` | `DEBUG` for verbose |
| `AI_SERVICE_API_KEY` | — | **generate with `openssl rand -hex 32`** |
| `AI_CORS_ORIGINS` | `http://localhost:5000` | Comma-separated Node domains |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/zhi_college` | Same DB as Node ERP |
| `MONGO_DB_NAME` | `zhi_college` | |
| `ML_MODELS_DIR` | `./ml_models` | Where `.pkl` live |
| `TESSERACT_CMD` | `/usr/bin/tesseract` | Set on Render via Aptfile path |
| `OCR_LANG` | `eng` | Add `+hin` etc. for extra languages |

---

## 🏁 Quick start (local)

```bash
# 1. install
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. system deps for OCR
sudo apt install tesseract-ocr poppler-utils        # Debian/Ubuntu
brew install tesseract poppler                      # macOS

# 3. train dummy models (~10 s)
python train_dummy_models.py

# 4. start
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for interactive Swagger UI.

---

## 🧪 Smoke tests

```bash
# health
curl http://localhost:8000/health/ready

# performance
curl -X POST http://localhost:8000/ai/performance \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: $AI_SERVICE_API_KEY" \
  -d '{"attendance_pct":82,"avg_internal_marks":75,
       "assignments_submitted_pct":90,"fee_paid":1,
       "backlogs_count":0,"hours_studied_per_week":12}'

# OCR
curl -X POST http://localhost:8000/ai/document \
  -H "X-Internal-Key: $AI_SERVICE_API_KEY" \
  -F "file=@/path/to/marksheet.jpg"
```

---

## 🧠 Two training scripts

### `train_dummy_models.py` (fast, no DB)
Generates synthetic data with realistic distributions and trains all 3
models. Ideal for CI, staging, or fresh Render builds where the DB is
still empty.

### `train_real_models.py` (uses MongoDB)
Reads real collections (`students`, `marks`, `attendances`,
`transactions`, `feetransactions`, `expenses` …), builds Pandas
features and trains on them. If a collection has fewer than 40 rows,
it tops up with synthetic samples so the artefact is always valid.

Recommended build command on Render:
```
pip install -r requirements.txt && python train_real_models.py
```

---

## 🧾 Document AI details

- **Backends supported**: image files (JPEG, PNG, TIFF, BMP) and PDFs
  (Poppler converts to images via `pdf2image`).
- **Entities extracted** (regex-based NLP): `name`, `roll_no`, `dob`,
  `aadhaar`, `pan`, `email`, `phone`, `percentage`, `cgpa`.
- **Doc-type guess**: `AADHAAR / PAN / MARKSHEET / ADMISSION_FORM / ID_CARD / UNKNOWN`.
- Max file size: **15 MB**. Files are held in memory only.

Swap Tesseract for **PaddleOCR** by uncommenting the two lines in
`requirements.txt` and updating `_image_bytes_to_text` in `main.py`.

---

## 🐛 Common errors

| Error | Cause | Fix |
|---|---|---|
| `401 Invalid or missing X-Internal-Key` | Wrong or missing header | Set `AI_SERVICE_API_KEY` matching Node side |
| `503 performance model not loaded` | Missing `.pkl` | Run `train_dummy_models.py` or `train_real_models.py` |
| `TesseractNotFoundError` | Binary not installed | Install `tesseract-ocr` (Aptfile handles Render) |
| PDF error `poppler not installed` | PDF path taken without poppler | Install `poppler-utils` |
| Mongo timeout at boot | Wrong `MONGO_URI` or Atlas IP block | Whitelist `0.0.0.0/0` in Atlas Network Access |

---

## 🚀 Render deployment

See root [`RENDER_DEPLOY.md`](../RENDER_DEPLOY.md) — one-click Blueprint
deploy that provisions both this service and the Node.js ERP together.
