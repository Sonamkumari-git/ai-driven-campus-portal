"""
Generates synthetic training data and exports 3 pickled models:

    ml_models/
        performance_model.pkl      # XGBRegressor  -> predicts final % score
        at_risk_model.pkl          # XGBClassifier -> predicts dropout risk (0/1)
        finance_anomaly_model.pkl  # IsolationForest for transaction anomalies

Run:
    python train_dummy_models.py
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from xgboost import XGBRegressor, XGBClassifier

RNG = np.random.default_rng(42)
MODELS_DIR = os.getenv("ML_MODELS_DIR", "./ml_models")
os.makedirs(MODELS_DIR, exist_ok=True)


# --------------------------------------------------------------------------- #
# 1) Performance regressor
# Features: attendance_pct, avg_internal_marks, assignments_submitted_pct,
#           fee_paid (0/1), backlogs_count, hours_studied_per_week
# Target : final_score_pct (0-100)
# --------------------------------------------------------------------------- #
def train_performance_model(n: int = 2000) -> None:
    attendance = RNG.uniform(40, 100, n)
    internals = RNG.uniform(30, 100, n)
    assignments = RNG.uniform(20, 100, n)
    fee_paid = RNG.integers(0, 2, n)
    backlogs = RNG.integers(0, 6, n)
    study_hrs = RNG.uniform(0, 40, n)

    noise = RNG.normal(0, 4, n)
    final = (
        0.30 * attendance
        + 0.35 * internals
        + 0.15 * assignments
        + 3.0 * fee_paid
        - 4.0 * backlogs
        + 0.30 * study_hrs
        + noise
    )
    final = np.clip(final, 0, 100)

    X = pd.DataFrame({
        "attendance_pct": attendance,
        "avg_internal_marks": internals,
        "assignments_submitted_pct": assignments,
        "fee_paid": fee_paid,
        "backlogs_count": backlogs,
        "hours_studied_per_week": study_hrs,
    })

    model = XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=2,
    )
    model.fit(X, final)
    path = os.path.join(MODELS_DIR, "performance_model.pkl")
    joblib.dump({"model": model, "features": list(X.columns)}, path)
    print(f"[ok] saved {path}")


# --------------------------------------------------------------------------- #
# 2) At-Risk classifier  (dropout probability)
# --------------------------------------------------------------------------- #
def train_at_risk_model(n: int = 2000) -> None:
    attendance = RNG.uniform(30, 100, n)
    internals = RNG.uniform(25, 100, n)
    backlogs = RNG.integers(0, 8, n)
    fee_pending_months = RNG.integers(0, 12, n)
    disciplinary = RNG.integers(0, 3, n)

    logit = (
        -0.08 * attendance
        - 0.05 * internals
        + 0.6 * backlogs
        + 0.25 * fee_pending_months
        + 0.9 * disciplinary
        + 5.5
    )
    prob = 1 / (1 + np.exp(-logit))
    y = (prob > 0.5).astype(int)

    X = pd.DataFrame({
        "attendance_pct": attendance,
        "avg_internal_marks": internals,
        "backlogs_count": backlogs,
        "fee_pending_months": fee_pending_months,
        "disciplinary_actions": disciplinary,
    })

    model = XGBClassifier(
        n_estimators=250,
        max_depth=4,
        learning_rate=0.08,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=2,
    )
    model.fit(X, y)
    path = os.path.join(MODELS_DIR, "at_risk_model.pkl")
    joblib.dump({"model": model, "features": list(X.columns)}, path)
    print(f"[ok] saved {path}")


# --------------------------------------------------------------------------- #
# 3) Finance anomaly (Isolation Forest)
# Features: amount, hour_of_day, day_of_week, is_weekend,
#           deviation_from_avg (amount / student's avg)
# --------------------------------------------------------------------------- #
def train_finance_anomaly_model(n: int = 3000) -> None:
    amount = RNG.lognormal(mean=8.5, sigma=0.5, size=n)   # ~₹5k median
    hour = RNG.integers(0, 24, n)
    dow = RNG.integers(0, 7, n)
    is_weekend = (dow >= 5).astype(int)
    deviation = RNG.normal(1.0, 0.25, n)

    # Inject 3% outliers
    idx = RNG.choice(n, size=int(0.03 * n), replace=False)
    amount[idx] *= RNG.uniform(8, 25, size=idx.size)
    deviation[idx] *= RNG.uniform(4, 12, size=idx.size)

    X = pd.DataFrame({
        "amount": amount,
        "hour_of_day": hour,
        "day_of_week": dow,
        "is_weekend": is_weekend,
        "deviation_from_avg": deviation,
    })

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=2,
    )
    model.fit(X)
    path = os.path.join(MODELS_DIR, "finance_anomaly_model.pkl")
    joblib.dump({"model": model, "features": list(X.columns)}, path)
    print(f"[ok] saved {path}")


if __name__ == "__main__":
    print(f"Writing models into: {MODELS_DIR}")
    train_performance_model()
    train_at_risk_model()
    train_finance_anomaly_model()
    print("Done.")
