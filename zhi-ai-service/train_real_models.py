"""
train_real_models.py
====================
Trains the 3 ML models on REAL data from your MongoDB (same DB the
Node.js ERP writes to), and saves them into ml_models/:

    performance_model.pkl      XGBRegressor
    at_risk_model.pkl          XGBClassifier
    finance_anomaly_model.pkl  IsolationForest

Run:
    python train_real_models.py

Env vars (from .env or shell):
    MONGO_URI       (required)
    MONGO_DB_NAME   (default: zhi_college)
    ML_MODELS_DIR   (default: ./ml_models)

If a collection has too few rows to train reliably, we top up the
dataset with synthetic samples so the pipeline still produces a
working artefact (logs a warning).
"""
from __future__ import annotations

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import joblib
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from sklearn.ensemble import IsolationForest
from xgboost import XGBClassifier, XGBRegressor

load_dotenv()

logging.basicConfig(
    level=os.getenv("AI_SERVICE_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)-7s | %(message)s",
)
log = logging.getLogger("train_real")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "zhi_college")
MODELS_DIR = os.getenv("ML_MODELS_DIR", "./ml_models")
MIN_ROWS = 40           # below this we top up with synthetic samples
SYNTH_TARGET = 400      # target row count after top-up

os.makedirs(MODELS_DIR, exist_ok=True)


# --------------------------------------------------------------------------- #
# Mongo helpers
# --------------------------------------------------------------------------- #
def connect() -> MongoClient:
    if not MONGO_URI:
        log.error("MONGO_URI is not set. Export it or add it to .env")
        sys.exit(1)
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, appname="zhi-ai-trainer")
    client.admin.command("ping")
    log.info("Connected to MongoDB (db=%s)", DB_NAME)
    return client


def find_first_non_empty(db, candidates: List[str]) -> str | None:
    for c in candidates:
        try:
            if db[c].estimated_document_count() > 0:
                return c
        except PyMongoError:
            continue
    return None


def _pct(numer: float, denom: float) -> float:
    if not denom or denom <= 0:
        return 0.0
    return float(np.clip((numer / denom) * 100.0, 0.0, 100.0))


# --------------------------------------------------------------------------- #
# Extractors (heuristics — adjust to your actual field names)
# --------------------------------------------------------------------------- #
def build_student_features(db) -> pd.DataFrame:
    """
    Aggregate student attendance + marks + fees into one training row per student.
    Adjust field names below if your ERP schema differs.
    """
    rows: List[Dict[str, Any]] = []

    students_col = find_first_non_empty(db, ["students"])
    if not students_col:
        log.warning("No students collection found — synthetic only")
        return pd.DataFrame()

    marks_col = find_first_non_empty(db, ["marks", "internalmarks", "examresults"])
    att_col = find_first_non_empty(db, ["attendances", "attendance"])
    fees_col = find_first_non_empty(db, ["feetransactions", "transactions", "feecollections", "fees"])

    for s in db[students_col].find({}):
        sid = s.get("_id")
        # ----- attendance % -----
        attended = conducted = 0
        if att_col:
            for a in db[att_col].find({"studentId": sid}):
                # tolerate several shapes
                total = int(a.get("totalClasses") or a.get("conducted") or 0)
                pres = int(a.get("attended") or a.get("present") or 0)
                if not total and a.get("status") in ("present", "absent"):
                    # per-class row style
                    conducted += 1
                    if a["status"] == "present":
                        attended += 1
                else:
                    conducted += total
                    attended += pres
        attendance_pct = _pct(attended, conducted) if conducted else float(s.get("attendancePct", 75))

        # ----- average internal marks -----
        marks_vals: List[float] = []
        if marks_col:
            for m in db[marks_col].find({"studentId": sid}):
                for k in ("marks", "score", "obtained"):
                    v = m.get(k)
                    if isinstance(v, (int, float)) and 0 <= v <= 100:
                        marks_vals.append(float(v))
                        break
        avg_internal = float(np.mean(marks_vals)) if marks_vals else float(s.get("avgMarks", 60))

        # ----- backlogs / disciplinary from student doc -----
        backlogs = int(s.get("backlogs", 0) or 0)
        disciplinary = int(s.get("disciplinaryActions", 0) or 0)
        assignments_pct = float(s.get("assignmentsSubmittedPct", 80))
        study_hrs = float(s.get("hoursStudiedPerWeek", 10))

        # ----- fee status -----
        fee_paid = 1
        fee_pending_months = 0
        if fees_col:
            paid_total = 0.0
            expected = float(s.get("feeExpected", 0) or 0)
            last_paid_dt = None
            for f in db[fees_col].find({"studentId": sid}):
                amt = float(f.get("amount") or 0)
                if f.get("type", "").lower() in ("payment", "fee", "credit") or amt > 0:
                    paid_total += amt
                    dt = f.get("createdAt") or f.get("date")
                    if isinstance(dt, datetime):
                        last_paid_dt = dt if not last_paid_dt else max(last_paid_dt, dt)
            if expected > 0 and paid_total < expected * 0.95:
                fee_paid = 0
            if last_paid_dt:
                months = max(0, (datetime.utcnow() - last_paid_dt).days // 30)
                fee_pending_months = min(months, 24)

        # Ground-truth-ish label for regressor: use finalScore if available,
        # else synthesise from features (so the model still learns the right shape).
        final_score = float(s.get("finalScore") or s.get("lastFinalPct") or 0)
        if final_score <= 0:
            final_score = float(np.clip(
                0.30 * attendance_pct + 0.35 * avg_internal + 0.15 * assignments_pct
                + 3.0 * fee_paid - 4.0 * backlogs + 0.30 * study_hrs
                + np.random.normal(0, 3),
                0, 100,
            ))

        # dropout label heuristic
        dropped = int(s.get("dropped", 0) or 0)
        if not dropped:
            score_signal = (
                0.6 * (attendance_pct < 55)
                + 0.5 * (avg_internal < 45)
                + 0.4 * (backlogs >= 3)
                + 0.3 * (fee_pending_months >= 4)
                + 0.5 * (disciplinary >= 1)
            )
            dropped = int(score_signal >= 1.0)

        rows.append({
            "student_id": str(sid),
            "attendance_pct": attendance_pct,
            "avg_internal_marks": avg_internal,
            "assignments_submitted_pct": assignments_pct,
            "fee_paid": fee_paid,
            "backlogs_count": backlogs,
            "hours_studied_per_week": study_hrs,
            "fee_pending_months": fee_pending_months,
            "disciplinary_actions": disciplinary,
            "final_score_pct": final_score,
            "dropped": dropped,
        })

    return pd.DataFrame(rows)


def build_transaction_features(db) -> pd.DataFrame:
    """Recent transactions → features for IsolationForest."""
    col = find_first_non_empty(db, ["transactions", "feetransactions", "feecollections", "expenses"])
    if not col:
        return pd.DataFrame()

    since = datetime.utcnow() - timedelta(days=180)
    docs = list(db[col].find({"createdAt": {"$gte": since}}).limit(20000))
    if not docs:
        docs = list(db[col].find({}).limit(20000))
    if not docs:
        return pd.DataFrame()

    amounts = np.array([float(d.get("amount") or 0) for d in docs], dtype=float)
    avg_amt = max(float(np.mean(amounts[amounts > 0])) if (amounts > 0).any() else 1.0, 1.0)

    rows: List[Dict[str, Any]] = []
    for d in docs:
        try:
            amt = float(d.get("amount") or 0)
            if amt <= 0:
                continue
            ts = d.get("createdAt") or d.get("date") or datetime.utcnow()
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except Exception:
                    ts = datetime.utcnow()
            rows.append({
                "amount": amt,
                "hour_of_day": ts.hour,
                "day_of_week": ts.weekday(),
                "is_weekend": int(ts.weekday() >= 5),
                "deviation_from_avg": amt / avg_amt,
            })
        except Exception:
            continue
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- #
# Synthetic top-up (only used when real rows are insufficient)
# --------------------------------------------------------------------------- #
_RNG = np.random.default_rng(42)


def synth_students(n: int) -> pd.DataFrame:
    attendance = _RNG.uniform(40, 100, n)
    internals = _RNG.uniform(30, 100, n)
    assignments = _RNG.uniform(20, 100, n)
    fee_paid = _RNG.integers(0, 2, n)
    backlogs = _RNG.integers(0, 6, n)
    study_hrs = _RNG.uniform(0, 40, n)
    fee_pending = _RNG.integers(0, 8, n)
    disciplinary = _RNG.integers(0, 3, n)
    final = np.clip(
        0.30 * attendance + 0.35 * internals + 0.15 * assignments
        + 3.0 * fee_paid - 4.0 * backlogs + 0.30 * study_hrs
        + _RNG.normal(0, 4, n),
        0, 100,
    )
    logit = (-0.08 * attendance - 0.05 * internals + 0.6 * backlogs
             + 0.25 * fee_pending + 0.9 * disciplinary + 5.5)
    dropped = ((1 / (1 + np.exp(-logit))) > 0.5).astype(int)
    return pd.DataFrame({
        "attendance_pct": attendance,
        "avg_internal_marks": internals,
        "assignments_submitted_pct": assignments,
        "fee_paid": fee_paid,
        "backlogs_count": backlogs,
        "hours_studied_per_week": study_hrs,
        "fee_pending_months": fee_pending,
        "disciplinary_actions": disciplinary,
        "final_score_pct": final,
        "dropped": dropped,
    })


def synth_transactions(n: int) -> pd.DataFrame:
    amount = _RNG.lognormal(8.5, 0.5, n)
    hour = _RNG.integers(0, 24, n)
    dow = _RNG.integers(0, 7, n)
    is_weekend = (dow >= 5).astype(int)
    deviation = _RNG.normal(1.0, 0.25, n)
    idx = _RNG.choice(n, size=max(int(0.03 * n), 1), replace=False)
    amount[idx] *= _RNG.uniform(8, 25, size=idx.size)
    deviation[idx] *= _RNG.uniform(4, 12, size=idx.size)
    return pd.DataFrame({
        "amount": amount,
        "hour_of_day": hour,
        "day_of_week": dow,
        "is_weekend": is_weekend,
        "deviation_from_avg": deviation,
    })


# --------------------------------------------------------------------------- #
# Trainers
# --------------------------------------------------------------------------- #
def train_performance(df: pd.DataFrame) -> None:
    features = ["attendance_pct", "avg_internal_marks", "assignments_submitted_pct",
                "fee_paid", "backlogs_count", "hours_studied_per_week"]
    X, y = df[features], df["final_score_pct"]
    model = XGBRegressor(n_estimators=250, max_depth=5, learning_rate=0.08,
                         objective="reg:squarederror", random_state=42, n_jobs=2)
    model.fit(X, y)
    path = os.path.join(MODELS_DIR, "performance_model.pkl")
    joblib.dump({"model": model, "features": features}, path)
    log.info("saved %s  (rows=%d)", path, len(df))


def train_at_risk(df: pd.DataFrame) -> None:
    features = ["attendance_pct", "avg_internal_marks", "backlogs_count",
                "fee_pending_months", "disciplinary_actions"]
    X, y = df[features], df["dropped"].astype(int)
    if y.nunique() < 2:
        log.warning("dropped label has only one class — injecting synthetic minority")
        df = pd.concat([df, synth_students(200)], ignore_index=True)
        X, y = df[features], df["dropped"].astype(int)
    model = XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.08,
                          objective="binary:logistic", eval_metric="logloss",
                          random_state=42, n_jobs=2)
    model.fit(X, y)
    path = os.path.join(MODELS_DIR, "at_risk_model.pkl")
    joblib.dump({"model": model, "features": features}, path)
    log.info("saved %s  (rows=%d)", path, len(df))


def train_finance(df: pd.DataFrame) -> None:
    features = ["amount", "hour_of_day", "day_of_week", "is_weekend", "deviation_from_avg"]
    X = df[features]
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=2)
    model.fit(X)
    path = os.path.join(MODELS_DIR, "finance_anomaly_model.pkl")
    joblib.dump({"model": model, "features": features}, path)
    log.info("saved %s  (rows=%d)", path, len(df))


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> None:
    client = connect()
    db = client[DB_NAME]

    # --- Students / marks / attendance ---
    stu_df = build_student_features(db)
    if len(stu_df) < MIN_ROWS:
        log.warning("Only %d student rows — topping up with synthetic data", len(stu_df))
        stu_df = pd.concat([stu_df, synth_students(SYNTH_TARGET - len(stu_df))],
                           ignore_index=True)
    train_performance(stu_df)
    train_at_risk(stu_df)

    # --- Transactions ---
    tx_df = build_transaction_features(db)
    if len(tx_df) < MIN_ROWS:
        log.warning("Only %d transaction rows — topping up with synthetic data", len(tx_df))
        tx_df = pd.concat([tx_df, synth_transactions(SYNTH_TARGET - len(tx_df))],
                          ignore_index=True)
    train_finance(tx_df)

    log.info("All models retrained on real+synthetic data.")
    client.close()


if __name__ == "__main__":
    main()
