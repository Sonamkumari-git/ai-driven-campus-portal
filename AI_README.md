# AI_README.md
# ZHI College Management Portal — AI Engine (Mathematics & Modelling)

> This document captures the **mathematical formulation** and **modelling
> rationale** behind every AI-driven feature we are shipping in the ZHI ERP.
> It is deliberately written to double as a resume-ready technical writeup for
> the *Mathematics & Computing* teammate on the project.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Timetable Optimisation — Graph Colouring + CSP](#1-timetable-optimisation)
3. [Student Risk Predictor — XGBoost / MLP](#2-student-risk-predictor)
4. [Face Recognition — 128-d Embeddings + Cosine Similarity](#3-face-recognition)
5. [Financial Forecasting — Autoregressive Time Series](#4-financial-forecasting)
6. [Data Contract with the Node.js Portal](#5-data-contract)

---

## System Overview

```
┌────────────────────┐   HTTPS + JWT    ┌───────────────────────┐
│  Node.js / Express │  ─────────────▶  │  FastAPI Inference    │
│  (this repo)       │  ◀─────────────  │  ai_engine/python_    │
│                    │   JSON payload   │  service/main.py      │
└────────────────────┘                  └───────────────────────┘
         ▲                                          │
         │ Mongo aggregation                        │ .onnx / .pkl
         ▼                                          ▼
┌────────────────────┐                  ┌───────────────────────┐
│   MongoDB (seed +  │                  │  saved_models/        │
│   live college     │                  │  (git-lfs)            │
│   data)            │                  └───────────────────────┘
└────────────────────┘
```

Node performs auth, RBAC, and feature-vector aggregation from MongoDB. Python
performs pure numerical inference. This clean split keeps the ML surface
independently testable on Kaggle.

---

## 1) Timetable Optimisation

### 1.1 Graph Formulation

Represent every class-session (`course × subject × section × slot`) as a
vertex $v \in V$. Add an edge $(u, v) \in E$ whenever the two sessions share
**any** of:

- the same teacher, at overlapping times,
- the same classroom, at overlapping times, or
- the same student cohort (course/section), at overlapping times.

The problem *"assign a non-conflicting time-slot to every class"* reduces to
**Graph Vertex Colouring**:

$$
c : V \rightarrow \{1, 2, \dots, k\}
\quad \text{s.t.} \quad \forall (u,v) \in E,\; c(u) \neq c(v).
$$

The minimum $k$ that admits a valid $c$ is the **chromatic number**
$\chi(G)$. In our portal each colour corresponds to one canonical time-slot.

### 1.2 Constraint Satisfaction Framing

Beyond raw colouring we bind additional soft/hard rules — teacher preferences,
lab-vs-theory rooms, lunch breaks — turning the problem into a **CSP**
$\mathcal{P} = (X, D, C)$ where

- $X = \{x_1, \dots, x_n\}$ — one variable per session,
- $D_i \subseteq (\text{time} \times \text{room})$ — feasible domain,
- $C$ — the constraint set (teacher no-clash, room no-clash, capacity, etc.).

We solve $\mathcal{P}$ with Google **OR-Tools CP-SAT** and score every
candidate schedule $S$ using a **fitness function**:

$$
\mathrm{Fit}(S) \;=\; 1 \;-\;
\frac{\sum_{c \in C_\text{hard}} \mathbb{1}[c\;\text{violated}] \cdot w_c}
     {\sum_{c \in C_\text{hard}} w_c}
\;-\; \lambda \sum_{c \in C_\text{soft}} \mathrm{penalty}(c, S)
$$

The optimiser targets $\mathrm{Fit}(S) \rightarrow 1$. The Express route
`GET /api/ai/generate-timetable` returns
`{ conflictsBefore, conflictsAfter, chromaticNumber, fitness }`.

---

## 2) Student Risk Predictor

### 2.1 Feature Vector

For each student $i$ we assemble

$$
\mathbf{x}_i \;=\;
\big[\,\text{attendancePct},\;\text{avgMarks},\;\text{feeDelayDays},\;
\text{leaveCount},\;\text{parentEduLevel},\;\text{gender},\;\dots\big] \in \mathbb{R}^{d}
$$

pulled directly from MongoDB via `computeAttendancePct`, `computeAvgMarks`,
`computeFeeDelayDays` helpers in `src/routes/aiRoutes.js`.

### 2.2 Model: XGBoost Binary Classifier

Let $y_i \in \{0, 1\}$ denote *dropout / academic failure*. We train a
gradient-boosted ensemble

$$
\hat{p}_i \;=\; \sigma\!\Big(\sum_{k=1}^{K} f_k(\mathbf{x}_i)\Big),
\qquad f_k \in \mathcal{F}\;\text{(regression trees)}.
$$

with objective the **regularised binary cross-entropy**:

$$
\mathcal{L}(\theta) \;=\;
-\frac{1}{N}\sum_{i=1}^{N}
\Big[\, y_i \log \hat{p}_i \;+\; (1 - y_i) \log (1 - \hat{p}_i) \,\Big]
\;+\; \sum_{k=1}^{K} \Omega(f_k)
$$

$$
\Omega(f) \;=\; \gamma\, T \;+\; \tfrac{1}{2}\lambda\|w\|_2^2
$$

where $T$ is the leaf count and $w$ the leaf weights.

**Alternative head:** an MLP $\hat{p} = \sigma(W_2 \,\mathrm{ReLU}(W_1 \mathbf{x}
+ b_1) + b_2)$ trained with the same loss for comparison.

### 2.3 Risk Bands

$$
\text{band}(i) \;=\;
\begin{cases}
\text{HIGH}   & \hat{p}_i \geq 0.66 \\
\text{MEDIUM} & 0.33 \leq \hat{p}_i < 0.66 \\
\text{LOW}    & \hat{p}_i < 0.33
\end{cases}
$$

Exposed on the frontend as coloured badges next to every student row and on
the Director dashboard as an *Institution Academic Risk Alert* card.

### 2.4 Evaluation

Reported on the held-out fold:

- **AUC-ROC** ${=}\; \frac{1}{|P||N|}\sum_{p\in P,\,n\in N}\mathbb{1}[\hat p_p > \hat p_n]$
- **F1** ${=}\; \frac{2\,\text{precision}\,\text{recall}}{\text{precision}+\text{recall}}$
- **Calibration** via reliability diagrams + Brier score
  $\text{BS}=\tfrac{1}{N}\sum(\hat p_i - y_i)^2$.

---

## 3) Face Recognition

### 3.1 Embedding

A pre-trained ResNet-50 / FaceNet backbone $\phi_\theta : \mathbb{R}^{H\times W\times 3}
\rightarrow \mathbb{R}^{128}$ maps every enrolled student's cropped face image
to a **128-dimensional feature vector**. All vectors are L2-normalised:

$$
\mathbf{e}_i \;=\; \frac{\phi_\theta(I_i)}{\|\phi_\theta(I_i)\|_2}
\qquad \|\mathbf{e}_i\|_2 = 1.
$$

### 3.2 Similarity & Decision Rule

Verification at attendance-time compares the live capture $\mathbf{e}_q$
against the enrolled anchor $\mathbf{e}_i$ via **cosine similarity**:

$$
\mathrm{cos}(\mathbf{e}_q, \mathbf{e}_i)
\;=\; \frac{\mathbf{e}_q \cdot \mathbf{e}_i}{\|\mathbf{e}_q\|\|\mathbf{e}_i\|}
\;=\; \mathbf{e}_q^\top \mathbf{e}_i
\quad (\text{since unit-normed}).
$$

Decision:

$$
\text{verified}(q, i) \;=\;
\begin{cases}
1 & \mathrm{cos}(\mathbf{e}_q, \mathbf{e}_i) \geq \tau \\
0 & \text{otherwise}
\end{cases},
\qquad \tau \approx 0.72 \text{ (tuned on validation)}.
$$

### 3.3 Loss (Training)

Backbone fine-tuning uses **Triplet Loss** with hard-negative mining:

$$
\mathcal{L}_{\text{trip}} \;=\;
\sum_i \big[\, \|\mathbf{e}^a_i - \mathbf{e}^p_i\|_2^2 -
              \|\mathbf{e}^a_i - \mathbf{e}^n_i\|_2^2 + \alpha \,\big]_+
$$

or ArcFace-style **additive angular margin**:

$$
\mathcal{L}_{\text{arc}} \;=\;
-\log \frac{e^{s(\cos(\theta_{y_i}+m))}}
       {e^{s(\cos(\theta_{y_i}+m))} + \sum_{j\neq y_i} e^{s\cos\theta_j}}.
$$

---

## 4) Financial Forecasting

### 4.1 Series

We aggregate MongoDB `Transaction` and `Expense` collections into two monthly
series:

$$
R_t \;=\; \sum_{\text{txn} \in \text{month }t} \text{amount},
\qquad
E_t \;=\; \sum_{\text{exp} \in \text{month }t} \text{amount}.
$$

### 4.2 AR(p) Model

Assume the process is (locally) stationary and fit an **autoregressive model**
of order $p$:

$$
R_t \;=\; c \;+\; \sum_{k=1}^{p} \varphi_k R_{t-k} \;+\; \varepsilon_t,
\qquad \varepsilon_t \sim \mathcal{N}(0, \sigma^2).
$$

Parameters $\{c, \varphi_1, \dots, \varphi_p, \sigma^2\}$ are fit by
**Ordinary Least Squares** (equivalently: maximum-likelihood under Gaussian
$\varepsilon$). $p$ is chosen by minimising the **Akaike Information
Criterion**

$$
\mathrm{AIC}(p) \;=\; 2p \;-\; 2\ln \hat{L}(p).
$$

### 4.3 Forecast

The $h$-step-ahead forecast for revenue is recursively

$$
\hat R_{t+h} \;=\; c + \sum_{k=1}^{p} \varphi_k \hat R_{t+h-k},
\qquad h = 1, 2, \dots, H.
$$

The Node bridge fills the current-quarter *seed* $R_t, E_t$ from real
transactions (last 90 days) and calls
`POST /forecast/finance` with `{horizonMonths: 6}` to obtain
$\{\hat R_{t+1}, \dots, \hat R_{t+6}\}$ and analogous
$\{\hat E_{t+h}\}$. The Director dashboard displays the two series and net
profit $\hat P_{t+h} = \hat R_{t+h} - \hat E_{t+h}$.

### 4.4 Upgrade Path

Once the residual autocorrelation function shows structure the model is
promoted to **SARIMAX** for seasonality:

$$
\Phi(B^s)\phi(B)(1-B)^d(1-B^s)^D R_t \;=\; \Theta(B^s)\theta(B)\varepsilon_t,
$$

or to an **LSTM** with $\mathbf{h}_t = \mathrm{LSTM}(\mathbf{h}_{t-1}, R_{t-1})$,
$\hat R_t = w^\top \mathbf{h}_t + b$, trained by minimising

$$
\mathcal{L} \;=\; \tfrac{1}{T}\sum_{t=1}^{T}(R_t - \hat R_t)^2.
$$

---

## 5) Data Contract

| Route (Express)                    | Method | Consumer role     | Python endpoint         |
|------------------------------------|--------|-------------------|-------------------------|
| `/api/ai/predict-risk`             | GET/POST | director, hod, teacher, accountant | `/predict/risk`      |
| `/api/ai/generate-timetable`       | GET/POST | director, hod    | `/optimize/timetable` |
| `/api/ai/verify-face`              | POST   | director, hod, teacher | `/verify/face`      |
| `/api/ai/financial-forecast`       | GET/POST | director, accountant | `/forecast/finance` |
| `/api/ai/health`                   | GET    | any authenticated  | `/health`             |

All Express handlers **fall back to internal mock computation** derived from
MongoDB seed data when `AI_SERVICE_URL` is unset or the FastAPI process is
down, so the portal remains demo-able at every stage of ML development.
