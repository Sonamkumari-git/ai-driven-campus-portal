"""
ZHI AI Microservice
===================
FastAPI service exposing AI endpoints consumed by the Node.js ERP:

    POST /ai/performance         (XGBoost regressor)
    POST /ai/at-risk             (XGBoost classifier)
    POST /ai/attendance-risk     (ML + rule engine)
    POST /ai/finance-anomaly     (Isolation Forest, optional Mongo scan)
    POST /ai/document /ai/ocr    (multipart file → OCR → structured JSON)

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import io
import logging
import os
import re
import gc
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict
from sklearn.ensemble import IsolationForest

# OCR
from PIL import Image
import pytesseract

# Try pdf2image for PDF support (needs poppler installed via Docker/apt)
try:
    from pdf2image import convert_from_bytes
    HAS_PDF2IMAGE = True
except Exception:  # pragma: no cover
    HAS_PDF2IMAGE = False

from database import connect_to_mongo, close_mongo_connection, get_db

# --------------------------------------------------------------------------- #
# Config / logging
# --------------------------------------------------------------------------- #
load_dotenv()

logging.basicConfig(
    level=os.getenv("AI_SERVICE_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("zhi-ai")

MODELS_DIR = os.getenv("ML_MODELS_DIR", "./ml_models")
API_KEY = os.getenv("AI_SERVICE_API_KEY", "change-this-strong-random-key")
CORS_ORIGINS = [o.strip() for o in os.getenv("AI_CORS_ORIGINS", "*").split(",") if o.strip()]
TESS_CMD = os.getenv("TESSERACT_CMD", "").strip()
OCR_LANG = os.getenv("OCR_LANG", "eng")

if TESS_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESS_CMD


# --------------------------------------------------------------------------- #
# Model registry (loaded on startup)
# --------------------------------------------------------------------------- #
class ModelRegistry:
    performance: Optional[Dict[str, Any]] = None
    at_risk: Optional[Dict[str, Any]] = None
    finance_anomaly: Optional[Dict[str, Any]] = None


registry = ModelRegistry()


def _load_pkl(name: str) -> Optional[Dict[str, Any]]:
    path = os.path.join(MODELS_DIR, name)
    if not os.path.exists(path):
        logger.warning("Model file missing: %s (endpoint will 503 until trained)", path)
        return None
    try:
        payload = joblib.load(path)
        logger.info("Loaded model: %s", name)
        return payload
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to load %s: %s", name, exc)
        return None


def load_all_models() -> None:
    registry.performance = _load_pkl("performance_model.pkl")
    registry.at_risk = _load_pkl("at_risk_model.pkl")
    registry.finance_anomaly = _load_pkl("finance_anomaly_model.pkl")


# --------------------------------------------------------------------------- #
# Lifespan
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Booting ZHI AI service …")
    try:
        await connect_to_mongo()
    except Exception as exc:
        logger.warning("Mongo unavailable at boot (%s). Endpoints that need DB will 503.", exc)
    load_all_models()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="ZHI AI-Powered College Management — AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

# --------------------------------------------------------------------------- #
# CORS
# --------------------------------------------------------------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Internal API-key guard (skip /health, /docs, root)
# --------------------------------------------------------------------------- #
PUBLIC_PATHS = {"/", "/health", "/health/live", "/health/ready", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def internal_key_guard(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS or request.method == "OPTIONS":
        return await call_next(request)
    provided = request.headers.get("x-internal-key")
    if provided != API_KEY:
        logger.warning("Unauthorized access attempt to %s", request.url.path)
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing X-Internal-Key"},
        )
    return await call_next(request)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal AI service error", "error": str(exc)},
    )


# --------------------------------------------------------------------------- #
# Pydantic schemas
# --------------------------------------------------------------------------- #
class PerformanceRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    student_id: Optional[str] = None
    attendance_pct: float = Field(..., ge=0, le=100)
    avg_internal_marks: float = Field(..., ge=0, le=100)
    assignments_submitted_pct: float = Field(..., ge=0, le=100)
    fee_paid: int = Field(..., ge=0, le=1)
    backlogs_count: int = Field(..., ge=0, le=20)
    hours_studied_per_week: float = Field(..., ge=0, le=100)


class PerformanceResponse(BaseModel):
    student_id: Optional[str]
    predicted_final_score: float
    predicted_grade: str
    risk_category: str


class AtRiskRequest(BaseModel):
    student_id: Optional[str] = None
    attendance_pct: float = Field(..., ge=0, le=100)
    avg_internal_marks: float = Field(..., ge=0, le=100)
    backlogs_count: int = Field(..., ge=0, le=20)
    fee_pending_months: int = Field(..., ge=0, le=36)
    disciplinary_actions: int = Field(..., ge=0, le=20)


class AtRiskResponse(BaseModel):
    student_id: Optional[str]
    dropout_probability: float
    risk_level: str
    top_factors: List[str]


class AttendanceRiskRequest(BaseModel):
    student_id: Optional[str] = None
    classes_attended: int = Field(..., ge=0)
    classes_conducted: int = Field(..., gt=0)
    classes_remaining: int = Field(..., ge=0)
    threshold_pct: float = Field(default=75.0, ge=0, le=100)


class AttendanceRiskResponse(BaseModel):
    student_id: Optional[str]
    current_pct: float
    projected_pct_if_no_more_missed: float
    classes_needed_to_reach_threshold: int
    max_classes_can_miss: int
    status: str
    recommendation: str


class FinanceTransaction(BaseModel):
    tx_id: Optional[str] = None
    amount: float
    hour_of_day: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    is_weekend: int = Field(..., ge=0, le=1)
    deviation_from_avg: float = Field(default=1.0)


class FinanceAnomalyRequest(BaseModel):
    transactions: List[FinanceTransaction] = Field(default_factory=list)
    scan_recent_days: Optional[int] = Field(default=None, ge=1, le=365)


class FinanceAnomalyItem(BaseModel):
    tx_id: Optional[str]
    amount: float
    anomaly_score: float
    is_anomaly: bool


class FinanceAnomalyResponse(BaseModel):
    total_checked: int
    anomalies_found: int
    items: List[FinanceAnomalyItem]


class DocumentAIResponse(BaseModel):
    doc_type_guess: str
    raw_text: str
    extracted: Dict[str, Any]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _score_to_grade(score: float) -> str:
    if score >= 90:
        return "A+"
    if score >= 80:
        return "A"
    if score >= 70:
        return "B"
    if score >= 60:
        return "C"
    if score >= 50:
        return "D"
    if score >= 40:
        return "E"
    return "F"


def _score_to_risk(score: float) -> str:
    if score >= 70:
        return "LOW"
    if score >= 50:
        return "MEDIUM"
    return "HIGH"


def _prob_to_level(p: float) -> str:
    if p >= 0.7:
        return "HIGH"
    if p >= 0.4:
        return "MEDIUM"
    return "LOW"


# --------------------------------------------------------------------------- #
# Health & Root
# --------------------------------------------------------------------------- #
@app.get("/", tags=["Root"])
async def root():
    return {"service": "zhi-ai-service", "version": app.version, "docs": "/docs"}


@app.get("/health/live", tags=["Health"])
async def live():
    return {"status": "ok"}


@app.get("/health/ready", tags=["Health"])
async def ready():
    from database import mongo
    mongo_ok = False
    try:
        if mongo.client is not None:
            await mongo.client.admin.command("ping")
            mongo_ok = True
    except Exception:
        mongo_ok = False
    return {
        "status": "ready",
        "mongo": mongo_ok,
        "models_loaded": {
            "performance": registry.performance is not None,
            "at_risk": registry.at_risk is not None,
            "finance_anomaly": registry.finance_anomaly is not None,
        },
    }


# --------------------------------------------------------------------------- #
# 1) Performance prediction
# --------------------------------------------------------------------------- #
@app.post("/ai/performance", response_model=PerformanceResponse, tags=["AI"])
async def predict_performance(payload: PerformanceRequest):
    if registry.performance is None:
        raise HTTPException(status_code=503, detail="performance model not loaded")

    try:
        model = registry.performance["model"]
        features: List[str] = registry.performance["features"]
        row = pd.DataFrame([[
            payload.attendance_pct,
            payload.avg_internal_marks,
            payload.assignments_submitted_pct,
            payload.fee_paid,
            payload.backlogs_count,
            payload.hours_studied_per_week,
        ]], columns=features)

        pred = float(np.clip(model.predict(row)[0], 0, 100))
        return PerformanceResponse(
            student_id=payload.student_id,
            predicted_final_score=round(pred, 2),
            predicted_grade=_score_to_grade(pred),
            risk_category=_score_to_risk(pred),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("performance prediction failed")
        raise HTTPException(status_code=500, detail=f"prediction error: {exc}")


# --------------------------------------------------------------------------- #
# 2) At-Risk detection
# --------------------------------------------------------------------------- #
@app.post("/ai/at-risk", response_model=AtRiskResponse, tags=["AI"])
async def predict_at_risk(payload: AtRiskRequest):
    if registry.at_risk is None:
        raise HTTPException(status_code=503, detail="at-risk model not loaded")

    try:
        model = registry.at_risk["model"]
        features: List[str] = registry.at_risk["features"]
        row = pd.DataFrame([[
            payload.attendance_pct,
            payload.avg_internal_marks,
            payload.backlogs_count,
            payload.fee_pending_months,
            payload.disciplinary_actions,
        ]], columns=features)

        proba = float(model.predict_proba(row)[0][1])

        factors: List[str] = []
        if payload.attendance_pct < 60:
            factors.append("Low attendance")
        if payload.avg_internal_marks < 45:
            factors.append("Low internal marks")
        if payload.backlogs_count >= 2:
            factors.append(f"{payload.backlogs_count} backlogs")
        if payload.fee_pending_months >= 3:
            factors.append("Fees pending > 3 months")
        if payload.disciplinary_actions >= 1:
            factors.append("Disciplinary record")

        return AtRiskResponse(
            student_id=payload.student_id,
            dropout_probability=round(proba, 4),
            risk_level=_prob_to_level(proba),
            top_factors=factors or ["No major risk indicators"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("at-risk prediction failed")
        raise HTTPException(status_code=500, detail=f"prediction error: {exc}")


# --------------------------------------------------------------------------- #
# 3) Attendance risk (rule engine)
# --------------------------------------------------------------------------- #
@app.post("/ai/attendance-risk", response_model=AttendanceRiskResponse, tags=["AI"])
async def attendance_risk(payload: AttendanceRiskRequest):
    try:
        conducted = payload.classes_conducted
        attended = min(payload.classes_attended, conducted)
        remaining = payload.classes_remaining
        threshold = payload.threshold_pct / 100.0

        current_pct = (attended / conducted) * 100 if conducted else 0.0
        total_final = conducted + remaining
        projected_pct = ((attended + remaining) / total_final) * 100 if total_final else 0.0

        needed = 0
        for k in range(0, remaining + 1):
            if total_final == 0:
                break
            if (attended + k) / total_final >= threshold:
                needed = k
                break
        else:
            needed = remaining + 1

        max_can_miss = max(remaining - needed, 0) if needed <= remaining else 0

        if needed > remaining:
            status_label = "IMPOSSIBLE"
            recommendation = (
                f"Cannot reach {payload.threshold_pct:.0f}% this term. "
                f"Speak to academic advisor."
            )
        elif current_pct >= payload.threshold_pct:
            status_label = "SAFE"
            recommendation = (
                f"Currently at {current_pct:.1f}% — can miss up to "
                f"{max_can_miss} more classes and stay above "
                f"{payload.threshold_pct:.0f}%."
            )
        elif needed <= remaining * 0.7:
            status_label = "AT_RISK"
            recommendation = (
                f"Attend at least {needed} of next {remaining} classes to "
                f"reach {payload.threshold_pct:.0f}%."
            )
        else:
            status_label = "CRITICAL"
            recommendation = (
                f"Must attend {needed} of next {remaining} classes — "
                f"very little margin."
            )

        return AttendanceRiskResponse(
            student_id=payload.student_id,
            current_pct=round(current_pct, 2),
            projected_pct_if_no_more_missed=round(projected_pct, 2),
            classes_needed_to_reach_threshold=needed,
            max_classes_can_miss=max_can_miss,
            status=status_label,
            recommendation=recommendation,
        )
    except Exception as exc:
        logger.exception("attendance-risk failed")
        raise HTTPException(status_code=500, detail=f"attendance error: {exc}")


# --------------------------------------------------------------------------- #
# 4) Finance anomaly (Isolation Forest)
# --------------------------------------------------------------------------- #
async def _fetch_recent_transactions(days: int) -> List[FinanceTransaction]:
    try:
        db = get_db()
    except RuntimeError:
        return []

    since = datetime.utcnow() - timedelta(days=days)
    candidates = ["transactions", "feetransactions", "feecollections", "expenses"]
    docs: List[Dict[str, Any]] = []
    for col in candidates:
        try:
            cursor = db[col].find({"createdAt": {"$gte": since}}).limit(1000)
            docs = await cursor.to_list(length=1000)
            if docs:
                logger.info("Using Mongo collection: %s (%d docs)", col, len(docs))
                break
        except Exception:
            continue

    txs: List[FinanceTransaction] = []
    avg_amt = np.mean([float(d.get("amount", 0) or 0) for d in docs]) if docs else 1.0
    avg_amt = max(avg_amt, 1.0)
    for d in docs:
        try:
            amt = float(d.get("amount", 0) or 0)
            if amt <= 0:
                continue
            ts = d.get("createdAt") or d.get("date") or datetime.utcnow()
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except Exception:
                    ts = datetime.utcnow()
            txs.append(FinanceTransaction(
                tx_id=str(d.get("_id", "")),
                amount=amt,
                hour_of_day=ts.hour,
                day_of_week=ts.weekday(),
                is_weekend=int(ts.weekday() >= 5),
                deviation_from_avg=amt / avg_amt,
            ))
        except Exception:
            continue
    return txs


@app.post("/ai/finance-anomaly", response_model=FinanceAnomalyResponse, tags=["AI"])
async def finance_anomaly(payload: FinanceAnomalyRequest):
    try:
        txs = list(payload.transactions)
        if payload.scan_recent_days and not txs:
            txs = await _fetch_recent_transactions(payload.scan_recent_days)

        if not txs:
            return FinanceAnomalyResponse(total_checked=0, anomalies_found=0, items=[])

        if registry.finance_anomaly is None:
            logger.warning("finance model not loaded → fitting ad-hoc IsolationForest")
            model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
            features = ["amount", "hour_of_day", "day_of_week", "is_weekend", "deviation_from_avg"]
            df_fit = pd.DataFrame([t.model_dump() for t in txs])[features]
            model.fit(df_fit)
        else:
            model = registry.finance_anomaly["model"]
            features = registry.finance_anomaly["features"]

        df = pd.DataFrame([t.model_dump() for t in txs])[features]
        scores = model.decision_function(df)
        preds = model.predict(df)

        items = [
            FinanceAnomalyItem(
                tx_id=t.tx_id,
                amount=t.amount,
                anomaly_score=float(round(-s, 4)),
                is_anomaly=bool(p == -1),
            )
            for t, s, p in zip(txs, scores, preds)
        ]
        anomalies = sum(1 for i in items if i.is_anomaly)
        return FinanceAnomalyResponse(
            total_checked=len(items),
            anomalies_found=anomalies,
            items=items,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("finance anomaly failed")
        raise HTTPException(status_code=500, detail=f"finance error: {exc}")


# --------------------------------------------------------------------------- #
# 5) Document AI (OCR + NLP entity extraction)
# --------------------------------------------------------------------------- #
_NAME_RE = re.compile(r"(?i)\bname[:\-\s]+([A-Z][A-Za-z .]{2,60})")
_ROLL_RE = re.compile(r"(?i)\b(roll(?:\s*no)?|reg(?:istration)?\s*no|enrolment)[:\-\s#]*([A-Z0-9\-\/]{4,20})")
_PERCENT_RE = re.compile(r"(\d{1,3}(?:\.\d{1,2})?)\s*%")
_CGPA_RE = re.compile(r"(?i)\bC?GPA[:\-\s]+(\d\.\d{1,2})")
_DOB_RE = re.compile(r"(?i)\b(dob|date of birth)[:\-\s]+([0-3]?\d[\/\-\.][01]?\d[\/\-\.](?:19|20)\d{2})")
_AADHAR_RE = re.compile(r"\b(\d{4}\s?\d{4}\s?\d{4})\b")
_PAN_RE = re.compile(r"\b([A-Z]{5}\d{4}[A-Z])\b")
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"\b([6-9]\d{9})\b")


def _guess_doc_type(text: str) -> str:
    t = text.lower()
    if "aadhaar" in t or "aadhar" in t or "unique identification" in t:
        return "AADHAAR"
    if "permanent account number" in t or "income tax" in t or _PAN_RE.search(text):
        return "PAN"
    if any(k in t for k in ["marks statement", "mark sheet", "marksheet", "grade card", "cgpa"]):
        return "MARKSHEET"
    if any(k in t for k in ["admission", "enrolment", "enrollment"]):
        return "ADMISSION_FORM"
    if any(k in t for k in ["identity card", "student id", "id card"]):
        return "ID_CARD"
    return "UNKNOWN"


def _extract_entities(text: str) -> Dict[str, Any]:
    out: Dict[str, Any] = {}

    if m := _NAME_RE.search(text):
        out["name"] = m.group(1).strip()

    if m := _ROLL_RE.search(text):
        out["roll_no"] = m.group(2).strip()

    if m := _DOB_RE.search(text):
        out["dob"] = m.group(2).strip()

    if m := _AADHAR_RE.search(text):
        out["aadhaar"] = re.sub(r"\s+", "", m.group(1))

    if m := _PAN_RE.search(text):
        out["pan"] = m.group(1)

    if m := _EMAIL_RE.search(text):
        out["email"] = m.group(0)

    if m := _PHONE_RE.search(text):
        out["phone"] = m.group(1)

    pcts = [float(p) for p in _PERCENT_RE.findall(text) if 0 <= float(p) <= 100]
    if pcts:
        out["percentage"] = max(pcts)

    if m := _CGPA_RE.search(text):
        out["cgpa"] = float(m.group(1))

    return out


def _image_bytes_to_text(data: bytes, content_type: str) -> str:
    """Run Tesseract on an image OR each page of a PDF."""
    ct = (content_type or "").lower()
    texts: List[str] = []

    if "pdf" in ct or data[:4] == b"%PDF":
        if not HAS_PDF2IMAGE:
            raise HTTPException(
                status_code=500,
                detail="PDF received but pdf2image/poppler not installed",
            )
        pages = convert_from_bytes(data, dpi=150)  # Optimized DPI for memory
        for pg in pages:
            texts.append(pytesseract.image_to_string(pg, lang=OCR_LANG))
            pg.close()
        del pages
        gc.collect()
    else:
        img = Image.open(io.BytesIO(data))
        if img.mode != "RGB":
            img = img.convert("RGB")
        texts.append(pytesseract.image_to_string(img, lang=OCR_LANG))
        img.close()

    return "\n".join(texts).strip()


@app.post("/ai/document", response_model=DocumentAIResponse, tags=["AI"])
@app.post("/ai/ocr", response_model=DocumentAIResponse, tags=["AI"])
@app.post("/ocr", response_model=DocumentAIResponse, tags=["AI"])
@app.post("/ai/document-ocr", response_model=DocumentAIResponse, tags=["AI"])
async def document_ai(file: UploadFile = File(...)):
    """
    Multipart upload of an image (jpg/png) or PDF.
    Returns raw OCR text + parsed key fields.
    """
    logger.info("Processing OCR document: filename=%s, content_type=%s", file.filename, file.content_type)
    try:
        if not file.content_type or not any(
            file.content_type.startswith(p) for p in ("image/", "application/pdf")
        ):
            # Fallback for generic octet-stream if filename matches PDF/image
            if not (file.filename and file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg'))):
                raise HTTPException(
                    status_code=415,
                    detail=f"Unsupported content type: {file.content_type}",
                )

        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(data) > 15 * 1024 * 1024:  # 15 MB safety cap
            raise HTTPException(status_code=413, detail="File too large (>15 MB)")

        raw_text = _image_bytes_to_text(data, file.content_type or "")
        if not raw_text:
            raw_text = "No text could be extracted from this document."

        return DocumentAIResponse(
            doc_type_guess=_guess_doc_type(raw_text),
            raw_text=raw_text,
            extracted=_extract_entities(raw_text),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("document AI failed")
        raise HTTPException(status_code=500, detail=f"OCR error: {exc}")


# --------------------------------------------------------------------------- #
# Entrypoint (local dev only; on Render, uvicorn is the start command)
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("AI_SERVICE_HOST", "0.0.0.0"),
        port=int(os.getenv("AI_SERVICE_PORT", "8000")),
        reload=os.getenv("AI_SERVICE_ENV", "development") == "development",
    )
