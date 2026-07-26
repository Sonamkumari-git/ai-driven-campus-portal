/**
 * aiController.js
 * -----------------
 * All the "brains" that talk to the Python FastAPI service.
 * Each exported handler:
 *   • builds the outbound request,
 *   • attaches the X-Internal-Key header (from process.env.AI_SERVICE_API_KEY),
 *   • forwards the JSON/FormData body to AI_SERVICE_URL,
 *   • normalises success + error responses back to the browser.
 *
 * Kept controller-only (no Express routing) so routes/aiRoutes.js
 * stays small and testable.
 */
const axios = require('axios');
const FormData = require('form-data');

const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const AI_KEY = process.env.AI_SERVICE_API_KEY || 'change-this-strong-random-key';
const AI_TIMEOUT_MS = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '60000', 10);

// Reusable axios client — always injects the internal key + timeout
const ai = axios.create({
  baseURL: AI_URL,
  timeout: AI_TIMEOUT_MS,
  headers: { 'X-Internal-Key': AI_KEY, 'Accept': 'application/json' },
});

/* ------------------------------------------------------------------ */
/* Helper: uniform error response so the frontend can trust the shape  */
/* ------------------------------------------------------------------ */
function forwardError(res, err, label) {
  if (err.response) {
    // FastAPI returned a non-2xx
    const detail =
      err.response.data?.detail ||
      err.response.data?.error ||
      err.response.data ||
      'AI service error';
    return res.status(err.response.status).json({
      success: false,
      module: label,
      error: typeof detail === 'string' ? detail : JSON.stringify(detail),
    });
  }
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({ success: false, module: label, error: 'AI service timeout' });
  }
  return res.status(502).json({
    success: false,
    module: label,
    error: err.message || 'AI service unreachable',
  });
}

/* ------------------------------------------------------------------ */
/* GET  /api/ai/health                                                 */
/* ------------------------------------------------------------------ */
exports.health = async (_req, res) => {
  try {
    const { data } = await ai.get('/health/ready');
    return res.json({ success: true, ai: data });
  } catch (err) {
    return forwardError(res, err, 'health');
  }
};

/* ------------------------------------------------------------------ */
/* 1) POST /api/ai/performance                                         */
/* ------------------------------------------------------------------ */
exports.performance = async (req, res) => {
  try {
    const { data } = await ai.post('/ai/performance', req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return forwardError(res, err, 'performance');
  }
};

/* ------------------------------------------------------------------ */
/* 2) POST /api/ai/at-risk                                             */
/* ------------------------------------------------------------------ */
exports.atRisk = async (req, res) => {
  try {
    const { data } = await ai.post('/ai/at-risk', req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return forwardError(res, err, 'at-risk');
  }
};

/* ------------------------------------------------------------------ */
/* 3) POST /api/ai/attendance-risk                                     */
/* ------------------------------------------------------------------ */
exports.attendanceRisk = async (req, res) => {
  try {
    const { data } = await ai.post('/ai/attendance-risk', req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return forwardError(res, err, 'attendance-risk');
  }
};

/* ------------------------------------------------------------------ */
/* 4) POST /api/ai/finance-anomaly                                     */
/* ------------------------------------------------------------------ */
exports.financeAnomaly = async (req, res) => {
  try {
    // Body may be { transactions: [...] } OR { scan_recent_days: N }
    const payload = Object.keys(req.body || {}).length
      ? req.body
      : { scan_recent_days: 30 };
    const { data } = await ai.post('/ai/finance-anomaly', payload);
    return res.json({ success: true, data });
  } catch (err) {
    return forwardError(res, err, 'finance-anomaly');
  }
};

/* ------------------------------------------------------------------ */
/* 5) POST /api/ai/document  (multipart file upload)                   */
/*    Requires multer memory-storage middleware in aiRoutes.js          */
/* ------------------------------------------------------------------ */
exports.document = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        module: 'document',
        error: 'No file uploaded (expected multipart field "file")',
      });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'upload.bin',
      contentType: req.file.mimetype || 'application/octet-stream',
    });

    const { data } = await ai.post('/ai/document', form, {
      headers: {
        ...form.getHeaders(),         // multipart boundary
        'X-Internal-Key': AI_KEY,     // preserve auth (spread above removes it)
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return res.json({ success: true, data });
  } catch (err) {
    return forwardError(res, err, 'document');
  }
};

/* ------------------------------------------------------------------ */
/* Aggregate helper used by the admin dashboard "AI Insights" panel    */
/* Combines a couple of quick calls so the frontend fires 1 request.    */
/* GET /api/ai/dashboard-insights                                       */
/* ------------------------------------------------------------------ */
exports.dashboardInsights = async (_req, res) => {
  const out = { finance: null, atRiskSample: null, errors: [] };
  try {
    const financeResp = await ai.post('/ai/finance-anomaly', { scan_recent_days: 30 });
    out.finance = financeResp.data;
  } catch (err) {
    out.errors.push({ module: 'finance-anomaly', error: err.message });
  }

  // A tiny synthetic "class" health probe — the dashboard just wants
  // a signal, actual per-student risk lives on the students page.
  try {
    const atRiskResp = await ai.post('/ai/at-risk', {
      attendance_pct: 68,
      avg_internal_marks: 55,
      backlogs_count: 2,
      fee_pending_months: 2,
      disciplinary_actions: 0,
    });
    out.atRiskSample = atRiskResp.data;
  } catch (err) {
    out.errors.push({ module: 'at-risk', error: err.message });
  }

  return res.json({ success: true, data: out });
};
