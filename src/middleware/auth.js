const { verify } = require('../utils/jwt');

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function tokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies.zhi_token || '';
}

function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

function isPageRequest(req) {
  return req.method === 'GET' && !req.path.startsWith('/api') && (req.accepts('html') || '').includes('html');
}

function deny(req, res, status, message) {
  if (isPageRequest(req)) return res.redirect('/index.html');
  return res.status(status).json({ success: false, message });
}

function requireAuth(allowedRoles = []) {
  const roles = allowedRoles.map(normalizeRole);
  return (req, res, next) => {
    try {
      const payload = verify(tokenFromRequest(req));
      req.user = payload;
      const userRole = normalizeRole(payload.role);
      const directorAllowed = userRole === 'director' && roles.length > 0;
      if (roles.length && !roles.includes(userRole) && !directorAllowed) {
        return deny(req, res, 403, 'You do not have permission to access this resource.');
      }
      return next();
    } catch (error) {
      return deny(req, res, 401, error.message || 'Authentication required.');
    }
  };
}

function requireApiAuth(req, res, next) {
  return requireAuth()(req, res, next);
}

module.exports = { requireAuth, requireApiAuth, tokenFromRequest };
