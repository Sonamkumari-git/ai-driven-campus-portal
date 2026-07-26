<div align="center">

# 🚀 Deploy ZHI AI-Powered ERP on Render

**End-to-end guide** — from a fresh GitHub repo to two live services
(`zhi-erp` + `zhi-ai-service`) sharing one MongoDB Atlas cluster.

</div>

---

## 📌 What we will deploy

```
┌─────────────────────────────────────────────────────────────┐
│                       RENDER                                │
│                                                             │
│   ┌────────────────────┐        ┌────────────────────────┐  │
│   │ zhi-erp            │ HTTPS  │ zhi-ai-service         │  │
│   │ Node.js · port 80  │───────▶│ Python · port 80       │  │
│   │ (public)           │  key   │ (internal only via key)│  │
│   └────────┬───────────┘        └──────────┬─────────────┘  │
│            │                               │                │
│            └───────────┬───────────────────┘                │
│                        ▼                                    │
│              ┌─────────────────────┐                        │
│              │ MongoDB Atlas       │                        │
│              │ zhi_college         │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ Users
```

Both services live in the **same GitHub repo**. Render's Blueprint
(`render.yaml`) creates and links them in one shot.

---

## ✅ Prerequisites checklist

| # | Item | How |
|---|---|---|
| 1 | GitHub repo containing this codebase | `git init && git remote add origin ...` |
| 2 | MongoDB Atlas cluster (free M0 is fine) | https://cloud.mongodb.com |
| 3 | Atlas connection string | Atlas → Connect → Drivers → copy URI |
| 4 | Render account | https://render.com (free) |
| 5 | Terminal with `openssl` | For generating the shared API key |

---

## 🔑 Step 1 — Generate the shared secret

Run once, keep the value safe. Both services will use it.

```bash
openssl rand -hex 32
# example output:
# a3f8b7c9d2e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9
```

You will paste this into **two** places on Render as `AI_SERVICE_API_KEY`.

---

## 🌐 Step 2 — Prepare MongoDB Atlas

1. **Cluster** → Create M0 free cluster (any region close to Render).
2. **Database Access** → add a user with read/write on your DB.
3. **Network Access** → add IP `0.0.0.0/0` (Render IPs are dynamic).
4. **Connect → Drivers → Node.js** → copy the URI:
   ```
   mongodb+srv://<user>:<pass>@cluster0.abcd.mongodb.net/zhi_college?retryWrites=true&w=majority
   ```
   Replace `<user>` / `<pass>` with your credentials.

> ⚠️ Do **not** commit the URI. It goes only into Render env vars.

---

## 📤 Step 3 — Push the repo to GitHub

```bash
cd nayaerp
git add .
git commit -m "AI microservice + Render blueprint"
git push origin main
```

Ensure `render.yaml` sits at repo root and `.env` files are gitignored.

---

## 🎛 Step 4 — Create both services via Blueprint

1. **Render Dashboard → New + → Blueprint**
2. Choose your GitHub repo.
3. Render reads `render.yaml` and shows a preview: **2 web services** —
   `zhi-erp` (Node) and `zhi-ai-service` (Python).
4. Click **Apply**.

Render will refuse to start until you fill the `sync: false` secrets.
That's Step 5.

---

## 🔐 Step 5 — Fill environment variables

### 5a. `zhi-erp` (Node.js)

| Variable | Value |
|---|---|
| `MONGO_URI` | *(Atlas URI from Step 2)* |
| `JWT_SECRET` | random 40+ char string |
| `ADMIN_EMAIL` | e.g. `admin@zhi.edu.in` |
| `ADMIN_PASSWORD` | strong password (change after first login) |
| `AI_SERVICE_API_KEY` | *(the 64-char hex from Step 1)* |

`AI_SERVICE_URL` is auto-populated by the Blueprint via
`fromService.hostport` — you don't need to set it manually.

### 5b. `zhi-ai-service` (Python)

| Variable | Value |
|---|---|
| `MONGO_URI` | *(same as above)* |
| `AI_SERVICE_API_KEY` | *(same 64-char hex from Step 1)* |
| `AI_CORS_ORIGINS` | `https://zhi-erp.onrender.com` (or your custom domain) |

Everything else (`MONGO_DB_NAME`, `TESSERACT_CMD`, etc.) is pre-set
inside `render.yaml`.

---

## 🏗 Step 6 — First build

Render now runs, for each service:

**Node service** (`zhi-erp`)
```
npm install
node server.js
```

**Python service** (`zhi-ai-service`)
```
pip install --upgrade pip
pip install -r requirements.txt
python train_dummy_models.py         # generates .pkl files
uvicorn main:app --host 0.0.0.0 --port $PORT
```

The `Aptfile` triggers Render to install `tesseract-ocr` and
`poppler-utils` before pip runs.

Watch the **Logs** tab of each service until you see:

- Node: `Server running on port 10000`
- Python: `Application startup complete.`

---

## 🧪 Step 7 — Verify

### 7a. Ping the AI service directly (auth required)
```bash
curl https://zhi-ai-service.onrender.com/health/live
# → {"status":"ok"}
```

### 7b. Check the Node → FastAPI bridge
```bash
curl https://zhi-erp.onrender.com/api/ai/health
# → {"success":true,"ai":{"status":"ready","mongo":true,"models_loaded":{...}}}
```

If `success: false`:
- `AI service unreachable` → Python service is still starting (free tier cold start ≈ 30 s).
- `Invalid or missing X-Internal-Key` → `AI_SERVICE_API_KEY` mismatch — copy-paste the exact same value into both services.

### 7c. Open the admin dashboard
```
https://zhi-erp.onrender.com/index.html
```
Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. On the admin dashboard
you should see:

- 🟢 **AI Service Online** in the AI Insights panel
- The **📄 Upload Document (OCR)** button in the AI panel header
- A live finance-anomaly alert (once transactions exist)

---

## 🔁 Step 8 — Retrain on real data

Once your production DB has real students, marks, transactions:

Edit `render.yaml` build command for `zhi-ai-service`:
```yaml
buildCommand: |
  pip install --upgrade pip
  pip install -r requirements.txt
  python train_real_models.py       # <-- changed
```

Push → Render redeploys → new `.pkl` artefacts trained on live data.

Alternative: SSH is not available on Render — instead, use a
**Manual Deploy → Clear build cache & deploy** whenever you want a
retrain.

---

## 💰 Free-tier notes

| Concern | Reality | Mitigation |
|---|---|---|
| Cold starts | Free services sleep after 15 min idle → 20-40 s spin-up on next hit | Upgrade Python service to **Starter ($7/mo)** for OCR-heavy usage |
| RAM | 512 MB on free | Enough for Tesseract; upgrade for PaddleOCR |
| Persistent disk | None on free | Not required — `.pkl` regenerated during build |
| Uptime | 750 hrs/month | Fine for one project |

`render.yaml` currently sets:
- `zhi-erp` → `plan: free`
- `zhi-ai-service` → `plan: starter` (recommended for OCR)

Change to `free` if you want to test at zero cost, but expect slower
first hits.

---

## 🛠 Custom domain (optional)

1. Render → `zhi-erp` → Settings → Custom Domains → **Add**
2. Add e.g. `erp.yourcollege.edu.in`
3. Update DNS CNAME as shown
4. Update `AI_CORS_ORIGINS` on `zhi-ai-service` to your new domain

---

## 🧯 Troubleshooting cheat sheet

| Symptom | Root cause | Fix |
|---|---|---|
| Node service 500 on any AI route | Python service down | Restart `zhi-ai-service` in Render |
| `503 model not loaded` | Build didn't finish training | Clear build cache & redeploy |
| `MongoDB connection failed` | Wrong URI or Atlas IP block | Verify URI, whitelist `0.0.0.0/0` |
| OCR returns empty text | Bad image / Tesseract missing | Check Aptfile committed to repo |
| Dashboard shows "AI Service Unreachable" | Cold start | Wait 30 s or upgrade plan |
| CORS error in browser console | Wrong `AI_CORS_ORIGINS` | Set exact Node domain incl. https:// |

---

## 🔒 Security recap

- ✅ Browser never talks to Python directly — only Node.
- ✅ Python rejects any request without correct `X-Internal-Key`.
- ✅ CORS on Python locked to the Node domain (no wildcard).
- ✅ Mongo credentials only inside Render env vars.
- ✅ Session cookies + role checks handled by existing Node auth middleware.
- ⛔ Never commit `.env`. Both `.gitignore` files exclude it.

---

<div align="center">

**You're live!** 🎉

Root docs: [`README.md`](./README.md)  •  AI service: [`zhi-ai-service/README.md`](./zhi-ai-service/README.md)

</div>
