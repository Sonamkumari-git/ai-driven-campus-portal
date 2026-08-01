# AI Engine — Workspace for the ML Teammate

This directory is the **contract boundary** between the Node.js portal and the
Python/ML side of the project.

```
ai_engine/
├── kaggle_notebooks/   # .ipynb — experimentation & training on Kaggle
├── saved_models/       # exported .onnx / .pkl artefacts (git-lfs recommended)
└── python_service/     # FastAPI mock inference server
    ├── main.py
    └── requirements.txt
```

## Running the mock inference server

```bash
cd ai_engine/python_service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The Node backend’s `AI_SERVICE_URL` env var should then point to
`http://localhost:8001`. Until it does, the Express bridge (see
`src/routes/aiRoutes.js`) falls back to internal mock responses derived from
MongoDB seed data.

## Plugging in real models

1. Export the trained model from Kaggle:
   - Tabular: `joblib.dump(model, "risk_xgb.pkl")` or `onnx` via `onnxmltools`.
   - Vision: `torch.onnx.export(...)`.
2. Drop the artefact into `saved_models/`.
3. In `python_service/main.py`, replace the corresponding `_predict_*` stub
   with `model.predict(...)`.
4. Restart uvicorn — the Node side needs **no change**.
